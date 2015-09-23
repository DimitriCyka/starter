/*
 This file is part of LVL UP Starter. LVL UP Starter is free software: you can
 redistribute it and/or modify it under the terms of the GNU General Public
 License as published by the Free Software Foundation, version 2.
 
 This program is distributed in the hope that it will be useful, but WITHOUT
 ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 FOR A PARTICULAR PURPOSE. See the GNU General Public License for more
 details.
 
 You should have received a copy of the GNU General Public License along with
 this program; if not, write to the Free Software Foundation, Inc., 51
 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
 
 Copyright (C) 2015 Michał Frąckiewicz
 */
var httpreq = require('httpreq');
var fs = require('fs');

function loadProfile(onlineCb, offlineCb, noaccCb)
{
    fs.readFile(profileFile, "utf8", function (err, data)
    {
        if (err)
        {
            noaccCb();
        }
        else
        {
            //json may be damaged etc. we need to be careful
            try {
                var profile = JSON.parse(data);
                //check if there is a data about premium account
                if (typeof profile.selectedUser === "undefined")
                {
                    if (typeof profile.offline === "undefined")
                    {
                        //nothing here!
                        noaccCb();
                    }
                    else
                    {
                        cmdUsername = profile.offline;
                        offlineCb(profile.offline);
                    }
                }
                else
                {
                    //premium account info
                    var userid = profile.selectedUser;

                    //console.log(userid);
                    cmdUsername = profile.authenticationDatabase[userid].username;
                    cmdUuid = profile.authenticationDatabase[userid].uuid;
                    cmdAccessToken = profile.authenticationDatabase[userid].accessToken;

                    //console.log("premium account loaded");
                    onlineCb(username);
                }
            } catch (e)
            {
                noaccCb();
            }
        }
    });
}

function logout(cb)
{
    fs.writeFile(profileFile, "", function (err) {
        cb();
    });
}

function saveProfile(login, password, cb, fail)
{
    getProfile(login, password, function (err, profile) {
        if (!err && typeof profile.error === "undefined")
        {
            //console.log("profile ok");
            getUuid(profile.selectedProfile.name, function (err, uuid) {
                if (!err)
                {
                    //console.log("uuid ok");
                    saveToken(profile, profile.selectedProfile.name, uuid, function () {
                        cb(null, profile);
                    });
                }
                else
                {
                    fail();
                }
            });
        } else
        {
            fail();
        }
    });
}

function getProfile(login, password, cb)
{
    var payload =
            {
                "agent": {
                    "name": "Minecraft",
                    "version": 1
                },
                "username": login,
                "password": password
            };

    httpreq.post('https://authserver.mojang.com/authenticate', {
        json: payload
    }, function (err, res) {
        if (err)
            cb(err, JSON.parse(res.body));
//        if (res.statusCode == 200)
//        {
        cb(err, JSON.parse(res.body));
        //}
    });
}

function getUuid(username, cb)
{
    httpreq.get('https://api.mojang.com/users/profiles/minecraft/' + username, function (err, res) {
        if (err)
            return console.log(err);
//        if (res.statusCode == 200)
//        {
        var result = JSON.parse(res.body);
        cb(err, result.id);
        //}
    });
}

function saveToken(profile, username, uuid, cb)
{
    var profileId = profile.selectedProfile.id;

    var profileId = {};
    profileId[profile.selectedProfile.id] =
            {
                "username": username,
                "accessToken": profile.accessToken,
                //"userid": profileId, //fixme?
                "uuid": uuid,
                "displayName": profile.selectedProfile.name,
            };

    var result = {
        "selectedProfile": profile.selectedProfile.name,
        "clientToken": profile.clientToken,
        "authenticationDatabase": profileId,
        "selectedUser": profile.selectedProfile.id
    };
    fs.writeFile(profileFile, JSON.stringify(result), function (err) {
        if (err) {
            cb(err);
        } else {
            cb();
        }
    });
}

function saveOfflinetoken(username, cb)
{
    var config = {
        "offline": username
    };
    fs.writeFile(profileFile, JSON.stringify(config), function (err) {
        cb();
    });
}