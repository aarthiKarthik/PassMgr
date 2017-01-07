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
var selectedListElem = "";
var path = 'PassManager/';

//==================================================================================================
//                                              PAGE LOADING
//==================================================================================================
$(document).on("pageshow","#pageone",function(){
    document.getElementById("master_password").value = "";
});

$(document).on("pagebeforeshow","#pagethree",function(){
    document.getElementById("new_name").value = "";
    document.getElementById("new_password").value = "";
});

$(document).on("pagebeforeshow","#pagefive",function(){
    document.getElementById("new_master_password").value = "";
    document.getElementById("conf_new_master_password").value = "";
});

$(document).on("pageshow","#pagefour",function(){ // When entering pagetwo
  $("#ul_list").listview("refresh");
});

//==================================================================================================
//                                              CALLBACKS
//==================================================================================================

function store_master_password()
{
    var master_password = document.getElementById("master_password").value;

    if (supportsHTML5Storage() == false)
    {
         navigator.notification.alert("HTML5 Local Storage not supported !");
         return;
    }

    if(master_password == "")
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

    $.mobile.changePage($("#pagetwo"), "slide", true, true);
}

function change_master_password()
{
    var changed_master_password = document.getElementById("new_master_password").value;
    var conf_master_password = document.getElementById("conf_new_master_password").value;

    if((changed_master_password == "") || (conf_master_password == ""))
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

    for (var i = 0; i < localStorage.length; i++)
    {
        // Read from local storage
        var k = localStorage.key(i);
        if(k == "salt") continue;

        // Decrypt with old master key
        var options = { mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 };
        var decrypted_password = CryptoJS.AES.decrypt(localStorage.getItem(k), master_key.toString(), options);

        // Encrypt with new Master key
        var encrypted_password = CryptoJS.AES.encrypt(decrypted_password, new_master_key.toString(), options);

        // And store it back in local storage
        localStorage.setItem(k, encrypted_password);
    }

    navigator.notification.alert("Master Passphrase has been changed. Login again to view changes.");

    // Get user to re-login with new passphrase
    $.mobile.changePage($("#pageone"), "slide", true, true);
}

function display_list()
{
    populateList();
    $.mobile.changePage($("#pagefour"), "slide", true, true);
}

function new_entry()
{
    var name = document.getElementById("new_name").value;
    var password = document.getElementById("new_password").value;

    if(name == "" || password == "")
    {
        navigator.notification.alert("Name and Password are Required");
        return;
    }

    for (var i = 0; i < localStorage.length; i++)
    {
        var k = localStorage.key(i);
        var v = localStorage.getItem(k);
        if(name == k)
        {
            res = confirm("Name "+k+" overlaps with existing entry. Overwrite password?");
            if (res == false)
            {
                return;
            }
            else
            {
                break;
            }
        }
    }
    //navigator.notification.alert("Name is " + name);
    var options = { mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 };
    var encrypted_password = CryptoJS.AES.encrypt(password, master_key.toString(), options);
    //navigator.notification.alert("Encrypted password is " + encrypted_password.toString(CryptoJS.enc.Utf8));
    //console.log('Encrypted password is ' + encrypted_password)

    localStorage.setItem(name, encrypted_password);

    populateList();

    $.mobile.changePage($("#pagefour"), "slide", true, true);
}

function name_password(name)
{
    var options = { mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 };
    var decrypted_password = CryptoJS.AES.decrypt(localStorage.getItem(name), master_key.toString(), options);

    navigator.notification.alert("Password is: " + decrypted_password.toString(CryptoJS.enc.Utf8));
}

function remove_item()
{
    if (selectedListElem == "")
    {
         navigator.notification.alert("Please select an item to remove");
         return;
    }

    //Remove element from local storage
    localStorage.removeItem(selectedListElem.innerHTML);

    //navigator.notification.alert(selectedListElem.innerHTML);

    //Remove element from the list
    //var listElem = document.getElementById(selectedListElem);
    selectedListElem.parentNode.removeChild(selectedListElem);

    populateList();

    $("#ul_list").listview("refresh");
    //$.mobile.changePage($("#pagefour"), "slide", true, true);
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
    if (res == false){
        return;
    }

    for(var key in localStorage)
    {
        if (key == "salt")  continue;
        localStorage.removeItem(key);
    }
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
    if(salt == null)
    {
        // Generate salt for key generation
        salt = CryptoJS.lib.WordArray.random(128/8);
        localStorage.setItem("salt", salt);
    }

    var key256Bits = CryptoJS.PBKDF2(master_password, salt.toString(), { keySize: 256/32, iterations: 10 });

    return key256Bits;
}

function populateList()
{
    var list = "";

    for(var key in localStorage)
    {
        if (key == "salt")  continue;
        list = list + "<li><a href='javascript:name_password(\"" + key + "\")'>" + key + "</a></li>";
    }

    document.getElementById("ul_list").innerHTML = list;
}

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
                if((property == k) && (o[property] != v))
                {
                    res = confirm("Name "+k+" overlaps with existing entry. Overwrite password?");
                    if (res == false){
                        break;
                    }
                }
            }
            if (res == true) {
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
  if (folders[0] == '.' || folders[0] == '') {
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

