/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
var app = {
    // Application Constructor
    initialize: function() {
        this.bindEvents();
    },
    // Bind Event Listeners
    //
    // Bind any events that are required on startup. Common events are:
    // 'load', 'deviceready', 'offline', and 'online'.
    bindEvents: function() {
        document.addEventListener('deviceready', this.onDeviceReady, false);
    },
    // deviceready Event Handler
    //
    // The scope of 'this' is the event. In order to call the 'receivedEvent'
    // function, we must explicitly call 'app.receivedEvent(...);'
    onDeviceReady: function() {
        app.receivedEvent('deviceready');

        document.addEventListener("backbutton", function(e){
           if($.mobile.activePage.is('#homepage')){
               e.preventDefault();
               navigator.app.exitApp();
           }
           else {
               navigator.app.backHistory();
           }
        }, false);

        db = window.sqlitePlugin.openDatabase({name: "PASSMGR.db", location: 'default', androidDatabaseImplementation: 2});
        db2 = db;

        db.transaction(function(tx) {
            //create table
            tx.executeSql("CREATE TABLE IF NOT EXISTS passMgr (ndx integer primary key autoincrement, type_num integer, service_name text, uname text, pwd text, url text, email text, card_num text, pin text)");
            tx.executeSql("CREATE TABLE IF NOT EXISTS Hint (ndx integer primary key autoincrement, hint text)");
            console.log("TABLE(S) CREATED");
        }, function(err){
            //errors for all transactions are reported here
            alert("An error occurred while initializing the app !");
        });

    },
    // Update DOM on a Received Event
    receivedEvent: function(id) {
        var parentElement = document.getElementById(id);
        var listeningElement = parentElement.querySelector('.listening');
        var receivedElement = parentElement.querySelector('.received');

        listeningElement.setAttribute('style', 'display:none;');
        receivedElement.setAttribute('style', 'display:block;');

        console.log('Received Event: ' + id);
    }
};

app.initialize();

//==================================================================================================
//                                              GLOBAL VARS
//==================================================================================================
//var master_password = "";
var master_key = "";
var old_hint = "";
var selectedListElem = "";
var path = 'PassManager/';
//var ndx = 0;
var db = null;
var db2 = null;
//==================================================================================================
//                                              PAGE LOADING
//==================================================================================================

$(document).on("pageshow","#homepage",function(){
    document.getElementById("master_password").value = "";

    old_hint = localStorage.getItem("hint");
    /*// Get previous hint
    db.transaction(function(tx) {
        tx.executeSql("SELECT * FROM Hint LIMIT 1", [], function(tx,res){
                           num = res.rows.length;
                           console.log('Num of entries ' + num.toString());
                           if (res.rows.length > 0)
                           {
                                old_hint = res.rows.item(0).hint;
                           }

        }, function(err){
            navigator.notification.alert("An error occurred while retrieving Hint");
            return;
        });
    });*/

    document.getElementById("hint").value = old_hint;
});

$(document).on("pagebeforeshow","#pagethree",function(){
    $("#typeSelect").selectmenu("refresh", true);
//    document.getElementById("typeSelect").selectedIndex = 0;
//    //document.getElementById("new_password").value = "";
//    //document.getElementById("sub").style.display = "block";
});

$(document).on("pageshow","#pagefour",function(){
    document.getElementById('All').style.display = "block";
});

$(document).on("pagebeforeshow","#pagefive",function(){
    document.getElementById("new_master_password").value = "";
    document.getElementById("conf_new_master_password").value = "";
});

$(document).on("pageshow","#pagefour",function(){ // When entering pagetwo
  $("#ul_list").listview().listview("refresh");
});

$(document).on("pageshow","#pagesix",function(){ // When entering pagetwo
  $("#ul_list").listview().listview("refresh");
});

//==================================================================================================
//                                              CALLBACKS
//==================================================================================================

function store_master_password()
{
    var master_password = document.getElementById("master_password").value;

    if (supportsHTML5Storage() === false)
    {
         navigator.notification.alert("HTML5 Local Storage not supported !");
         return;
    }

    if(master_password === "")
    {
        navigator.notification.alert("Please enter master passphrase");
        return;
    }

    // Generate Master key to encrypt the passwords in local storage
    master_key = generateMasterKey(master_password);

    window.resolveLocalFileSystemURL(cordova.file.externalApplicationStorageDirectory, function (dir)
    {
        createDir(dir, path.split('/')); // fs.root is a DirectoryEntry.
    }, errorHandler);

    // Store Hint if any
    var hint = document.getElementById("hint").value;

    // Dont change hint unless modified by user.
    if (hint !== old_hint)
    {
        /*db.transaction(function(tx) {
                // Delete all rows
                tx.executeSql("TRUNCATE Hint");

                // Insert new row with latest Hint
                tx.executeSql("INSERT INTO Hint (hint) VALUES (?)", [hint], function(tx,res){
                    navigator.notification.alert("Hint Added Successfully");
                });
            }, function(err){
                navigator.notification.alert("An error occurred while adding Hint");
                return;
            });*/

         localStorage.setItem("hint", hint);
    }

    $.mobile.changePage($("#pagetwo"), "slide", true, true);
}

function change_master_password()
{
    var changed_master_password = document.getElementById("new_master_password").value;
    var conf_master_password = document.getElementById("conf_new_master_password").value;

    if((changed_master_password === "") || (conf_master_password === ""))
    {
        navigator.notification.alert("Please enter new master passphrase");
        return;
    }

    if(changed_master_password != conf_master_password)
    {
        navigator.notification.alert("Passphrases don't match. Please enter again");
        return;
    }

    //navigator.notification.alert("WARNING: ONCE PASSPHRASE IS CHANGED, PRIOR BACKUPS CAN'T BE USED TO RESTORE PASSWORDS !");

    //Remove old salt from local storage
    localStorage.removeItem("salt");
    // Generate New Master key to encrypt the passwords in local storage
    var new_master_key = generateMasterKey(changed_master_password);

    console.log("Change master pass New master key is " + new_master_key.toString());
    //var type_num_arr = ['0', '1', '2', '3', '4'];
    //for (var t = 0; t < 5; t++)
    {
       var pwd_arr = [];
       var pin_arr = [];
       var service_name_arr = [];
       var num = 0;
       db.transaction(function(tx) {
           tx.executeSql("SELECT * FROM passMgr", [], function(tx,res){
               num = res.rows.length;
               console.log('Num of entries ' + num.toString());
               for(var iii = 0; iii < res.rows.length; iii++)
               {
                    // Decrypt with old master key
                    var options = { mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 };
                    var decrypted_password = CryptoJS.AES.decrypt(res.rows.item(iii).pwd, master_key.toString(), options);
                    var decrypted_pin = CryptoJS.AES.decrypt(res.rows.item(iii).pin, master_key.toString(), options);
                    console.log('Change Master Pass Decrypted password is ' + decrypted_password.toString(CryptoJS.enc.Utf8));

                    // Encrypt with new Master key
                    var encrypted_password = CryptoJS.AES.encrypt(decrypted_password.toString(CryptoJS.enc.Utf8), new_master_key.toString(), options);
                    var encrypted_pin = CryptoJS.AES.encrypt(decrypted_pin.toString(CryptoJS.enc.Utf8), new_master_key.toString(), options);

                    pwd_arr[iii] = encrypted_password;
                    pin_arr[iii] = encrypted_pin;
                    service_name_arr[iii] = res.rows.item(iii).service_name;
                    //navigator.notification.alert("Encrypted password is " + encrypted_password.toString(CryptoJS.enc.Utf8));
                    console.log('Change Master Pass Encrypted password is ' + encrypted_password.toString());
               }

           });
       }, function(err){
           alert("An error occurred while changing the master passphrase !");
           return;
       });

        for(var iii = 0; iii < num; iii++)
        {
           db.transaction(function(tx) {
                tx.executeSql("UPDATE passMgr SET pwd=?, pin=? WHERE service_name=?", [pwd_arr[iii], pin_arr[iii], service_name_arr[iii]], function(tx,res){
                    console.log("Item " + iii.toString() + " Updated Successfully");
                });
           }, function(err){
                navigator.notification.alert("An error occurred while changing master passphrase");
                return;
           });
        }
    }

    navigator.notification.alert("Master Passphrase has been changed. Login again to view changes.");

    // Get user to re-login with new passphrase
    $.mobile.changePage($("#homepage"), "slide", true, true);
}

function new_entry()
{
    //document.getElementById("upd").style.display = "none";
    var type_num = document.getElementById("typeSelect").selectedIndex;
    var service_name = document.getElementById("service_name").value;
    var uname = document.getElementById("new_name").value;
    var password = document.getElementById("new_password").value;
    var url = document.getElementById("url").value;
    var email = document.getElementById("email").value;
    var card_num = document.getElementById("card_num").value;
    var pin = document.getElementById("card_pin").value;

    console.log("new entry Type num is " + type_num);

    if(service_name === "")
    {
        navigator.notification.alert("Service name is Required");
        return;
    }

   db.transaction(function(tx) {
        tx.executeSql("SELECT * FROM passMgr WHERE service_name = ?", [service_name], function(tx,res){
            if(res.rows.length > 0)
            {
                navigator.notification.alert("Service name already exists; please enter a unique name");
                return;
            }

        });
    }, function(err){
        alert("An error occurred while searching for service name");
        return;
    });
    console.log('New entry Password bef enc is ' + password);
    //navigator.notification.alert("Name is " + name);
    var options = { mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 };
    var encrypted_password = CryptoJS.AES.encrypt(password, master_key.toString(), options);
    var encrypted_pin = CryptoJS.AES.encrypt(pin, master_key.toString(), options);

    //navigator.notification.alert("Encrypted password is " + encrypted_password.toString(CryptoJS.enc.Utf8));
    console.log('New entry Encrypted password is ' + encrypted_password);

    db.transaction(function(tx) {
        tx.executeSql("INSERT INTO passMgr (type_num, service_name, uname, pwd, url, email, card_num, pin) VALUES (?,?,?,?,?,?,?,?)", [type_num, service_name, uname, encrypted_password, url, email, card_num, encrypted_pin], function(tx,res){
            navigator.notification.alert("Item Added Successfully");
            //ndx = ndx + 1;
        });
    }, function(err){
        navigator.notification.alert("An error occurred while adding the entry");
        return;
    });

    $.mobile.changePage($("#pagetwo"), "slide", true, true);
}

/*
function on_click_type(event) {
    var target = getEventTarget(event);

    var list = "";
    console.log("Before list generation");
    //$.mobile.changePage($("#pagesix"), "slide", true, true);
    //$.mobile.navigate($("#pagesix"), {transition: "slide", info: "info"});
    //$('#pagesix').on('pageshow', '#pagesix', function() {
    var type_num=0;
    db.transaction(function(tx) {
        tx.executeSql("SELECT (service_name) FROM passMgr WHERE type_num = ?", [type_num], function(tx,res){
            for(var iii = 0; iii < res.rows.length; iii++)
            {
                list = list + "<li><a href='javascript:name_password(\"" + res.rows.item(iii).service_name + "\")'>" + res.rows.item(iii).service_name + "</a></li>";
            }
            console.log(list);
        });
    }, function(err){
        alert("An error occurred while generating the list !");
    });

   document.getElementById("ul_list").innerHTML = list;
    $("#ul_list").listview("refresh");
}
*/

function on_click_type(type_num) {
    var list = "";
    //console.log("Before list generation");
    //$.mobile.changePage($("#pagesix"), "slide", true, true);
    //$.mobile.navigate($("#pagesix"), {transition: "slide", info: "info"});
    //$('#pagesix').on('pageshow', '#pagesix', function() {

    db.transaction(function(tx) {
        tx.executeSql("SELECT (service_name) FROM passMgr WHERE type_num = ?", [type_num], function(tx,res){
            for(var iii = 0; iii < res.rows.length; iii++)
            {
                list = list + "<li><a href='javascript:name_password(\"" + res.rows.item(iii).service_name + "\")'>" + res.rows.item(iii).service_name + "</a></li>";
            }
            //console.log(list);

            if (list === "") {
                navigator.notification.alert("No records found.");
                return;
            }

            $.mobile.changePage($("#pagesix"), "slide", true, true);
            //$("#ul_list").listview().listview("refresh");
            //document.getElementById("ul_list").innerHTML = "<li>Dummy</li>";
            document.getElementById("ul_list").innerHTML = list;
            $("#ul_list").listview("refresh");
        });
    }, function(err){
        alert("An error occurred while generating the list !");
        return;
    });
}

function openTab(evt, id) {
    var i, tabcontent, tablinks;
    tabcontent = document.getElementsByClassName("tabcontent");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }
    tablinks = document.getElementsByClassName("tablinks");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }
    document.getElementById(id).style.display = "block";
    evt.currentTarget.className += " active";
}

function name_password(service_name)
{
    edit_item(service_name);
    /*// Get the modal
    var modal = document.getElementById('myModal');

    db.transaction(function(tx) {
        tx.executeSql("SELECT * FROM passMgr WHERE service_name = ?", [service_name], function(tx,res){
            var service_name = res.rows.item(0).service_name;
            var uname = res.rows.item(0).uname;
            var enc_password = res.rows.item(0).pwd;
            var url = res.rows.item(0).url;
            var email = res.rows.item(0).email;
            var card_num = res.rows.item(0).card_num;
            var enc_pin = res.rows.item(0).pin;

            var options = { mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 };
            var decrypted_password = CryptoJS.AES.decrypt(enc_password, master_key.toString(), options);
            var decrypted_pin = CryptoJS.AES.decrypt(enc_pin, master_key.toString(), options);

            // When the user selects the link, open the modal
            modal.style.display = "block";

            var data_str = "Service name: " + service_name + "<br>";
            data_str = data_str + "Username: " + uname + "<br>";
            data_str = data_str + "Password: " + decrypted_password + "<br>";
            data_str = data_str + "URL: " + url + "<br>";
            data_str = data_str + "Email: " + email + "<br>";
            data_str = data_str + "Card Number: " + card_num + "<br>";
            data_str = data_str + "PIN: " + decrypted_pin + "<br>";

            document.getElementById("data_display").innerHTML = data_str;

        });
    }, function(err){
        alert(err.message);
        alert("An error occurred while displaying the details");
    });

    //navigator.notification.alert("Password is: " + decrypted_password.toString(CryptoJS.enc.Utf8));*/
}

function update_entry()
{
    var type_num = document.getElementById("typeSelect").selectedIndex;
    var service_name = document.getElementById("service_name").value;
    var uname = document.getElementById("new_name").value;
    var password = document.getElementById("new_password").value;
    var url = document.getElementById("url").value;
    var email = document.getElementById("email").value;
    var card_num = document.getElementById("card_num").value;
    var pin = document.getElementById("card_pin").value;

    if(service_name === "")
    {
        navigator.notification.alert("Service name is Required");
        return;
    }
    console.log("Update entry; Password bef enc is" + password);
    var options = { mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 };
    var encrypted_password = CryptoJS.AES.encrypt(password, master_key.toString(), options);
    var encrypted_pin = CryptoJS.AES.encrypt(pin, master_key.toString(), options);

    //navigator.notification.alert("Encrypted password is " + encrypted_password.toString(CryptoJS.enc.Utf8));
    console.log('Update entry Encrypted password is ' + encrypted_password);

    db.transaction(function(tx) {
        tx.executeSql("UPDATE passMgr SET type_num=?, uname=?, pwd=?, url=?, email=?, card_num=?, pin=? WHERE service_name=?", [type_num, uname, encrypted_password, url, email, card_num, encrypted_pin, service_name], function(tx,res){
            navigator.notification.alert("Item Updated Successfully");
        });
    }, function(err){
        navigator.notification.alert("An error occurred while updating the entry");
        return;
    });

    $.mobile.changePage($("#pagetwo"), "slide", true, true);
}

function edit_item(service_name)
{
    db.transaction(function(tx)
    {
        tx.executeSql("SELECT * FROM passMgr WHERE service_name = ?", [service_name], function(tx,res){
            $.mobile.changePage($("#pagethree"), "slide", true, true);

            document.getElementById("sub").style.display = "none";
            document.getElementById("service_name").disabled = true;

            document.getElementById("typeSelect").selectedIndex = res.rows.item(0).type_num;
            console.log("Edit item Type num is " + document.getElementById("typeSelect").selectedIndex);
            $("#typeSelect").selectmenu("refresh", true);
            //$("#typeSelect").prop('selectedIndex', res.rows.item(0).type_num);
            document.getElementById("service_name").value = res.rows.item(0).service_name;
            document.getElementById("new_name").value = res.rows.item(0).uname;
            document.getElementById("url").value = res.rows.item(0).url;
            document.getElementById("email").value = res.rows.item(0).email;
            document.getElementById("card_num").value = res.rows.item(0).card_num;

            //console.log('Edit Item Encrypted password is ' + res.rows.item(0).pwd);

            var options = { mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 };
            var decrypted_password = CryptoJS.AES.decrypt(res.rows.item(0).pwd.toString(), master_key.toString(), options);
            var decrypted_pin = CryptoJS.AES.decrypt(res.rows.item(0).pin.toString(), master_key.toString(), options);

            //var words = CryptoJS.enc.Base64.parse(decrypted_password);
            //var textString = decrypted_password.toString(CryptoJS.enc.Utf8); //CryptoJS.enc.Utf8.stringify(words); // 'Hello world'
            //console.log('Edit Item Dec pwd is ' + decrypted_password.toString());
            //console.log("Edit Item master key is " + master_key.toString());

            document.getElementById("new_password").value = decrypted_password.toString(CryptoJS.enc.Utf8);
            document.getElementById("card_pin").value = decrypted_pin.toString(CryptoJS.enc.Utf8);
        });
    }, function(err){
        alert(err.message);
        alert("An error occurred while searching for the selected item");
        return;
    });

    //update_entry();
}

function remove_item()
{
    var service_name = document.getElementById("service_name").value;
    var type_num = document.getElementById("typeSelect").selectedIndex;

    if(service_name === "")
    {
        navigator.notification.alert("Service name is Required");
        return;
    }

    //Remove element from table
    db.transaction(function(tx) {
        tx.executeSql("DELETE FROM passMgr WHERE service_name=?", [service_name], function(tx,res){
            alert("Item deleted successfully");
        });
    }, function(err){
        alert(err.message);
        alert("An error occurred while deleting the item");
        return;
    });

    //navigator.notification.alert(selectedListElem.innerHTML);

    //Remove element from the list
    //var listElem = document.getElementById(selectedListElem);
    //selectedListElem.parentNode.removeChild(selectedListElem);

    on_click_type(type_num);

    //$("#ul_list").listview("refresh");
}

function ul_on_click(event) {
    var target = getEventTarget(event);
    selectedListElem = target;
    //alert(selectedListElem.innerHTML);
    //navigator.notification.alert("on click called");
    /*var list = document.getElementById("test");
    list.removeChild(target);*/
}

//To clear all items except salt from localStorage
function clear_items_but_salt()
{
    var res = confirm("This action will erase all passwords from storage. Continue?");
    if (res === false){
        return;
    }

    db.transaction(function(tx) {
        tx.executeSql("DELETE FROM passMgr", [], function(tx,res){
        alert("All passwords successfully deleted");
        });
    }, function(err){
        alert(err.message);
        alert("An error occurred while deleting all items");
    });
}

function restore_file_contents()
{
    var myPath = cordova.file.externalApplicationStorageDirectory + "/" + path;
    listPath(myPath);
}


function save_text_as_file()
{
    var fileName = path + generateBackupFileName();
    //var fileName = generateBackupFileName();
    var textToWrite = getLocalStorage();
    console.log(textToWrite);

    //Cordova file access & write
    //window.requestFileSystem(LocalFileSystem.TEMPORARY, 5*1024*1024, function (fs)
    window.resolveLocalFileSystemURL(cordova.file.externalApplicationStorageDirectory, function (dir)
    {
        //createDir(dir, path.split('/')); // fs.root is a DirectoryEntry.
        console.log('Dir : ' + dir.fullPath);
        dir.getFile(dir.fullPath+fileName, { create: true, exclusive: false }, function (fileEntry)
        {
            //console.log("fileEntry is file?" + fileEntry.isFile.toString());
            console.log(fileEntry.fullPath);
            // fileEntry.name == 'someFile.txt'
            // fileEntry.fullPath == '/someFile.txt'
            fileName = fileEntry;
            //writeFile(fileEntry, null);
            fileEntry.createWriter(function (fileWriter) {
                fileWriter.write(textToWrite);
                navigator.notification.alert("Passwords backed up to "+dir.fullPath+fileName.name);

            }, errorHandler);

        }, errorHandler);

    }, errorHandler);

    //writeFile(fileName, textToWrite);
}

function reset_all_fields()
{
    //document.getElementById("upd").style.display = "none";
    //document.getElementById("delete").style.display = "none";

    document.getElementById("sub").style.display = "block";
    document.getElementById("service_name").disabled = false;

    //document.getElementById("typeSelect").selectedIndex = 0;
    $("#typeSelect").prop('selectedIndex', 0);
    document.getElementById("service_name").value = "";
    document.getElementById("new_name").value = "";
    document.getElementById("url").value = "";
    document.getElementById("email").value = "";
    document.getElementById("card_num").value = "";

    document.getElementById("new_password").value = "";
    document.getElementById("card_pin").value = "";
}
//==================================================================================================
//                                              UTILITIES
//==================================================================================================

function supportsHTML5Storage()
 {
  try
  {
    return 'localStorage' in window && window['localStorage'] !== null;
  } catch (e)
  {
    return false;
  }
}

function generateMasterKey(master_password)
{
    var salt = localStorage.getItem("salt");
    if(salt === null)
    {
        // Generate salt for key generation
        salt = CryptoJS.lib.WordArray.random(128/8);
        localStorage.setItem("salt", salt);
    }

    var key256Bits = CryptoJS.PBKDF2(master_password, salt.toString(), { keySize: 256/32, iterations: 10 });

    return key256Bits;
}

/*function populateList()
{
   var list = "";

   db.transaction(function(tx) {
       tx.executeSql("SELECT (service_name) FROM passMgr", [], function(tx,res){
           for(var iii = 0; iii < res.rows.length; iii++)
           {
               list = list + "<li><a href='javascript:name_password(\"" + res.rows.item(iii).service_name + "\")'>" + res.rows.item(iii).service_name + "</a></li>";
           }

           document.getElementById("ul_list").innerHTML = list;
           $("#ul_list").listview("refresh");
       });
   }, function(err){
       alert("An error occurred while generating the list !");
       return;
   });
}*/

//To monitor user selecting a list element
function getEventTarget(e) {
    e = e || window.event;
    return e.target || e.srcElement;
}

//To backup items from localStorage and return in JSON format string
function getLocalStorage() {
    var a = {};
    for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        var v = localStorage.getItem(k);
        a[k] = v;
    }
    var s = JSON.stringify(a);
    return s;
}

//To write to localStorage fromSON formatted string
function writeLocalStorage(data)
{
    var o = JSON.parse(data);
    for (var property in o)
    {
        if (o.hasOwnProperty(property))
        {
            var res = true;
            for (var i = 0; i < localStorage.length; i++)
            {
                var k = localStorage.key(i);
                var v = localStorage.getItem(k);
                if((property === k) && (o[property] !== v))
                {
                    res = confirm("Name "+k+" overlaps with existing entry. Overwrite password?");
                    if (res === false){
                        break;
                    }
                }
            }
            if (res === true) {
                localStorage.setItem(property, o[property]);
            }
        }
    }
}

function addZero(i) {
    if (i < 10) {
        i = "0" + i;
    }
    return i;
}

function generateBackupFileName()
{
  var today = new Date();
  var sToday = addZero(today.getDate()).toString();
  sToday += addZero(today.getMonth()+1).toString();
  sToday += today.getFullYear().toString();
  sToday += "_";
  sToday += addZero(today.getHours()).toString();
  sToday += addZero(today.getMinutes()).toString();
  sToday += addZero(today.getSeconds()).toString();
  return ("PassManagerBackup_" + sToday + ".txt");
}

/**
 * This function will draw the given path.
 */
function listPath(myPath)
{
  window.resolveLocalFileSystemURL(myPath, function (dirEntry)
  {
       var directoryReader = dirEntry.createReader();
       directoryReader.readEntries(onSuccessCallback,onFailCallback);
  });

  function onSuccessCallback(entries)
  {
       //alert(entries.length);
       var html = '';
       for (i=0; i<entries.length; i++)
       {
           var row = entries[i];
           if(row.isDirectory){
                 // We will draw the content of the clicked folder
                 html = html + '<li onclick="listPath('+"'"+row.nativeURL+"'"+');">'+row.name+'</li>';
           }else{
                 // alert the path of file
                 html = html + '<li onclick="readFile('+"'"+row.name+"','"+myPath+"'"+');">'+row.name+'</li>';
           }
       }
        document.getElementById("select-demo").innerHTML = html;
  }

  function onFailCallback(e)
  {
    console.error(e);
    // In case of error
  }
}

function  readFile(fileName, myPath)
{
    window.resolveLocalFileSystemURL(myPath, function (dir)
    {
        dir.getFile(fileName, { }, function (fileEntry)
        {
            fileEntry.file(function (file) {
                var reader = new FileReader();

                reader.onloadend = function() {
                    console.log("Successful file read: " + this.result);
                    navigator.notification.alert("Passwords restored from "+myPath+fileName);
                    writeLocalStorage(this.result);
                };

                reader.readAsText(file);

            });
        });
    });
}

function errorHandler(e) {
  var msg = '';

  switch (e.code) {
    case FileError.QUOTA_EXCEEDED_ERR:
      msg = 'QUOTA_EXCEEDED_ERR';
      break;
    case FileError.NOT_FOUND_ERR:
      msg = 'NOT_FOUND_ERR';
      break;
    case FileError.SECURITY_ERR:
      msg = 'SECURITY_ERR';
      break;
    case FileError.INVALID_MODIFICATION_ERR:
      msg = 'INVALID_MODIFICATION_ERR';
      break;
    case FileError.INVALID_STATE_ERR:
      msg = 'INVALID_STATE_ERR';
      break;
    default:
      msg = 'Unknown Error';
      break;
  };

  console.log('Error: ' + msg);
}

function writeFile(fileEntry, dataObj) {
    // Create a FileWriter object for our FileEntry (log.txt).
    fileEntry.createWriter(function (fileWriter) {

        fileWriter.onwriteend = function() {
            console.log("Successful file write...");
            //readFile(fileEntry);
        };

        fileWriter.onerror = function (e) {
            console.log("Failed file write: " + e.toString());
        };

        // If data object is not passed in,
        // create a new Blob instead.
        if (!dataObj) {
            dataObj = new Blob(['No passwords stored !'], { type: 'text/plain' });
        }

        fileWriter.write(dataObj);
    });
}

function createDir(rootDirEntry, folders)
{
  // Throw out './' or '/' and move on to prevent something like '/foo/.//bar'.
  if (folders[0] === '.' || folders[0] === '') {
    folders = folders.slice(1);
  }
  rootDirEntry.getDirectory("PassManager/", {create: true}, function(dirEntry) {
    // Recursively add the new subfolder (if we still have another to create).
    console.log("Dir created " + dirEntry.fullPath);
//    if (folders.length) {
//      createDir(dirEntry, "");
//    }
  }, errorHandler);
}



