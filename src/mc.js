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
var fs = require('fs');
var fsExtra = require('fs-extra');
var mkdirp = require("mkdirp");
var path = require("path");
var getDirName = require("path").dirname;
var os = require("os");
var checksum = require('checksum'), cs = checksum('sha1');
var async = require('async');
var libs = [];
var username = "lvlupowiec";
var assetsIndex;
var legacyAssetPath;
//
// 1st step - download version list
// mostly done! It works!
//

function downloadVersionList()
{
    //todo check date or force to download
    downloadIfNotExist(
            "http://s3.amazonaws.com/Minecraft.Download/versions/versions.json",
            mc_path + path.sep + "versions" + path.sep + "versions.json",
            processVersionList);
}

function processVersionList()
{
    fs.readFile(mc_path + path.sep + "versions" + path.sep + "versions.json", generateVersionList);
}

function generateVersionList(err, data)
{
    if (err)
        throw err
    var obj = JSON.parse(data);

    $.each(obj.versions, function (i, item) {
        appendVersionList(item);
    });
    //$("#versionsList").show();
}

function appendVersionList(item)
{
    $("#versionsList").append('<option value="' + item.id + '">' + item.id + '</option>');
}
//
// 2nd step - download version .json and .jar
// Works OK!
// 

function downloadVersionFiles(version, cb)
{
    async.series([
        function (cb) {
            downloadIfNotExist(
                    "http://s3.amazonaws.com/Minecraft.Download/versions/" + version + "/" + version + ".json",
                    mc_path + path.sep + "versions" + path.sep + version + path.sep + version + ".json",
                    function () {
                        cb(null);
                    });
        },
        function (cb) {
            downloadIfNotExist(
                    "http://s3.amazonaws.com/Minecraft.Download/versions/" + version + "/" + version + ".jar",
                    mc_path + path.sep + "versions" + path.sep + version + path.sep + version + ".jar",
                    function () {
                        cb(null);
                    });
        }
    ],
            function (err, results) {
                cb();
            });
}


//
// 3rd step - download libs
// seems OK!
//

function downloadLibs(version, cb2)
{
    readVersionFile(version, processLibs, cb2);
//    fs.readFile(mc_path + path.sep + "versions" + path.sep + version + path.sep + version + ".json", "utf8", function (err, data) {
//        processLibs(err, data, version);
//    });
}

function readVersionFile(version, cb, cb2)
{
    fs.readFile(mc_path + path.sep + "versions" + path.sep + version + path.sep + version + ".json", "utf8", function (err, data) {
        cb(err, JSON.parse(data), version, cb2);
    });
}

function processLibs(err, obj, version, cbz)
{
    if (err)
        throw err
//    var obj = JSON.parse(data);

    libs = [];
    async.eachLimit(obj.libraries, 4,
            function (data, cb) {

                //slow it a little
                //setTimeout(function () {
                //console.log(data.name);
                var r = needLibOS(data, version);
                if (r)
                {
                    //add to libs list
                    libs.push(r.path_jar);
                    //download SHA1 if needed
                    downloadIfNotExist(r.url_sha1, r.path_sha1, function () {
                        //download libs if SHA1 don't match
                        checkSha1Download(r.url_jar, r.path_jar, r.path_sha1, function () {
                            if (r.native)
                            {
                                unpackNatives(r.path_native_jar, r.path_native, function () {
                                    cb();
                                });
                            } else
                            {
                                cb();
                            }
                        });
                    });
                } else
                {
                    cb();
                }
                //}, 200);
            },
            function (err) {
                if (err) {
                    console.log("error when downloading");
                } else {
                    cbz();
                }
            }
    );
}

function needLibOS(lib, version)
{
    if (os.platform() == "win32")
    {
        return needLib(lib, version, "windows");
    } else if (os.platform() == "linux")
    {
        return needLib(lib, version, "linux");
    } else if (os.platform() == "darwin")
    {
        return needLib(lib, version, "osx");
    }
}

function returnLib(lib, version, myOS)
{
    var split = lib.name.split(":");
    var pathz = split[0].split(".").join("/") + "/" + split[1] + "/" + split[2] + "/";
    var filename = split[1] + "-" + split[2];
    var url = "https://libraries.minecraft.net/" + pathz;

    if (lib.natives)
    {
        var bits;
        if (os.arch() == "x64")
        {
            bits = "64";
        }
        else
        {
            bits = "32";
        }
        var nativeName = lib.natives[myOS].replace("${arch}", bits);
        var filenameNatives = filename + "-" + nativeName;
        return {
            "url_jar": url + filenameNatives + ".jar",
            "url_sha1": url + filenameNatives + ".jar.sha1",
            "path_sha1": mc_path + path.sep + "libraries" + path.sep + filenameNatives + ".jar.sha1",
            "path_jar": mc_path + path.sep + "libraries" + path.sep + filenameNatives + ".jar",
            "native": "natives-linux",
            "path_native_jar": mc_path + path.sep + "libraries" + path.sep + filenameNatives + ".jar",
            "path_native": mc_path + path.sep + "versions" + path.sep + version + "/" + version + "-natives"
        };
    }
    else
    {
        return {
            "url_jar": url + filename + ".jar",
            "url_sha1": url + filename + ".jar.sha1",
            "path_sha1": mc_path + path.sep + "libraries" + path.sep + split[1] + "-" + split[2] + ".jar.sha1",
            "path_jar": mc_path + path.sep + "libraries" + path.sep + split[1] + "-" + split[2] + ".jar",
        };
    }
}

function needLib(lib, version, myOS)
{
    if (lib.rules)
    {//tree starts here
        if (lib.rules[0].action == "allow")
        {
            try {
                if (lib.rules[0].os.name == myOS)
                {
                    return returnLib(lib, version, myOS);
                }
            } catch (e)
            {//if no OS in allow list
                if (lib.rules[1].os.name != myOS)
                {//keeps out twitch-platform native
                    return returnLib(lib, version, myOS);
                }
            }
        } else
        { //if no action allow
            var downloadIt = true;
            if (lib.rules[1].action == "disallow")
            {
                if (lib.rules[1].os.name != myOS)
                {
                    return returnLib(lib, version, myOS);
                }
            }
        }
    }
    else
    {
        return returnLib(lib, version, myOS);
    }
}

function downloadLibsDone()
{
    //console.log("Lib files downloaded!");
}

//
// 4th step - unpack natives
//

function unpackNatives(f, dest, cb)
{
    //console.log(f);
    //console.log(dest);
    //make dirs if needed
    mkdirp(getDirName(dest), function (err) {
        if (err)
            return cb(err);

        var DecompressZip = require('decompress-zip');
        var unzipper = new DecompressZip(f)

//        unzipper.on('error', function (err) {
//            console.log('Caught an error');
//        });

        unzipper.on('extract', function (log) {
            //console.log('Finished extracting');
            cb();
        });

        unzipper.on('progress', function (fileIndex, fileCount) {
            //console.log('Extracted file ' + (fileIndex + 1) + ' of ' + fileCount);
        });

        unzipper.extract({
            path: dest,
            filter: function (file) {
                //console.log(file);
                if (file.filename != "META-INF" && file.filename != "MANIFEST.MF")
                    return true;
            }
        });
    });
}


//
// 5th step - download assets
//
function downloadAssets(version, cb)
{
    readVersionFile(version, downloadAssetsList, cb);
    //console.log("downloadassets");
}

function downloadAssetsList(err, profile, version, cb)
{
    //console.log("downloadassetslist");
    var pathToIndex = mc_path + path.sep + "assets" + path.sep + "indexes" + path.sep;
    var indexFilename;
    var legacy;

    try {
        if (profile.assets)
        {
            assetsIndex = profile.assets;
            //console.log("assets property found");
            legacy = false;
            indexFilename = profile.assets + ".json";
            downloadIfNotExist("https://s3.amazonaws.com/Minecraft.Download/indexes/" + profile.assets + ".json", pathToIndex + indexFilename, function () {
                downloadAssetsToDisk(pathToIndex + indexFilename, legacy, cb);
            });
        } else
        {
            //todo fixme
            assetsIndex = "";
            //console.log("no assets property");
            legacy = true;
            indexFilename = "legacy.json";
            downloadIfNotExist("https://s3.amazonaws.com/Minecraft.Download/indexes/" + indexFilename, pathToIndex + indexFilename, function () {
                downloadAssetsToDisk(pathToIndex + indexFilename, legacy, cb);
            });
        }

    } catch (e)
    {
        //console.log("error with assets list")
    }
}

function downloadAssetsToDisk(assetsIndexPath, legacy, cb)
{
    //read assets index file
    fs.readFile(assetsIndexPath, "utf8", function (err, data) {
        //TODO if error
        data = JSON.parse(data);

        //convert object to array for async
        assets = [];
        $.each(data.objects, function (i, n) {
            n.file = i;
            assets.push(n);
        });

        //queue all files to download
        async.eachLimit(assets, 1, function (item, callback) {
            //console.log(item);
            //callback();
            downloadAssetFile(item, legacy, function ()
            {
                //console.log("download assetfile");
                callback(null);
            });
        }, function (err, results) {
            console.log(err);
            if (err)
            {
                console.log(err);
            } else
            {
                cb();
            }
        });

    });

}

function downloadAssetFile(asset, legacy, callback)
{
    var hash2Chars = asset.hash[0] + asset.hash[1];
    var assetUrl = "http://resources.download.minecraft.net/" + hash2Chars + "/" + asset.hash;
    var assetPath = mc_path + path.sep + "assets" + path.sep + "objects" + path.sep + hash2Chars + path.sep + asset.hash;
    //console.log(assetUrl);
    //console.log(assetPath);

    if (legacy)
    {
        legacyAssetPath = mc_path + path.sep + "assets" + path.sep + "virtual" + path.sep + "legacy";
        legacyAssetPathtoFile = legacyAssetPath + path.sep + path.normalize(asset.file);//todo fix windows // path.normalize(asset.file)

        //console.log(legacyAssetPathtoFile);
        checkSha1StringDownload(assetUrl, assetPath, asset.hash, function () {
            mkdirp(getDirName(legacyAssetPathtoFile), function (err) {
                if (!err)
                {
                    //copy file to legacy
                    fsExtra.copy(assetPath, legacyAssetPathtoFile, function (err) {
                        if (!err)
                        {
                            callback();
                        }
                    });
                }
            });
        });
    } else
    {
        checkSha1StringDownload(assetUrl, assetPath, asset.hash, function () {
            callback();
        });
    }
}
//
// 6th step - generate cmd
//

function generateCmd(version, callback)
{
    readVersionFile(version, makeCmd, callback);
}

function makeCmd(err, data, version, callback)
{
    //console.log(libs);
    var java = "java";
    var javaArgs = ["-Xmx512M", "-Xmn128M"];

    var libString = "-Djava.library.path=" + mc_path + path.sep + "versions" + path.sep + version + path.sep + version + "-natives";
    var mcString = mc_path + path.sep + "versions/" + version + "/" + version + ".jar";
    var mainClass = data.mainClass;

    var args = data.minecraftArguments;
    //general
    args = args.replace("${version_name}", version);
    args = args.replace("${game_directory}", mc_path);
    //auth
    args = args.replace("${auth_player_name}", cmdUsername);
    args = args.replace("${auth_access_token}", cmdAccessToken);
    args = args.replace("${auth_session}", cmdSession);
    args = args.replace("${auth_uuid}", cmdUuid);
    args = args.replace("${user_type}", "legacy");
    args = args.replace("${user_properties}", "{}");

    //assets
    //fixme

    //<1.8
    args = args.replace("${game_assets}", legacyAssetPath);

    //1.8>
    args = args.replace("${assets_root}", mc_path + path.sep + "assets");
    args = args.replace("${assets_index_name}", assetsIndex);

    //?
    //--userType legacy

    // : for linux, ; for windows
    if (os.platform() == "win32")
    {
        var libSep = ";"
    } else if (os.platform() == "linux")
    {
        var libSep = ":"
    } else if (os.platform() == "darwin")
    {
        var libSep = ":"
    }

    //prepare lib for cmd running
    var exec = require('child_process').exec;
    var finalCmd = java + " " + javaArgs.join(" ") + " " + libString + " -cp " + libs.join(libSep) + libSep + mcString + " " + mainClass + " " + args;
    //console.log(finalCmd);

    if (cmdAccessToken == "offline")
    {
        var mode = "offline";
    } else
    {
        var mode = "online";
    }

    ga_storage._trackPageview("/" + os.platform() + "/" + launcherVersion + '/start/' + mode + "/" + version);
    exec(finalCmd, function () {
        ga_storage._trackPageview("/" + os.platform() + "/" + launcherVersion + '/stop/' + mode + "/" + version);
        ga_storage._trackPageview("/" + os.platform() + "/" + launcherVersion + '/home/');
        callback();
    });
}

//
// 7th step - run
//