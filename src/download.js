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
var fs = require('fs-extra');
var mkdirp = require("mkdirp");
var getDirName = require("path").dirname;
var httpreq = require('httpreq');

function downloadBar(progress)
{
    var percentageRound = Math.round(progress.percentage);
    $("div .progress").show();
    $("div .download_progress").css('width', progress.percentage + '%').attr('aria-valuenow', progress.percentage);
    $("#download_progress_perc").text(percentageRound);
    $("#download_kb").text(Math.round(progress.currentsize / 1024) + "/" + Math.round(progress.totalsize / 1024) + "KB");
}

var download = function (url, dest, cb)
{
    //create folders if needed
    mkdirp(getDirName(dest), function (err) {
        if (err)
            return cb(err)

        httpreq.download(
                url,
                dest,
                function (err, progress) {
                    if (err)
                        return console.log(err);
                    //console.log(progress);
                    if (progress.percentage == 100)
                    {
                        //console.log("Downloaded " + url);
                        //console.log("To " + dest);
                        $("div .progress").hide();
                    } else
                    {
                        downloadBar(progress);
                    }
                }, function (err, res) {
            if (err)
                return console.log(err);
            cb(res);
        });
    })
}

function downloadIfNotExist(url, dest, cb)
{
    fs.exists(dest, function (exists) {
        if (exists) {
            cb();
        } else {
            return download(url, dest, cb);
        }
    });
}

function checkSha1Download(url, dest, sha1File, cb)
{
    fs.readFile(sha1File, 'utf8', function (err, content) {
        //no SHA1, download todo
        if (err) {
            return download(url, dest, cb);
        }
        //file found on disk, let's check SHA1
        checksum.file(dest, function (err, sum) {
            //console.log(content);
            //console.log(sum);
            if (sum == content.replace(/\W/g, ''))
            {
                //console.log("SHA1 ok");
                cb();
            }
            else
            {
                //console.log("Need to download it " + url);
                return download(url, dest, cb);
            }
        });
    });
}

function checkSha1StringDownload(url, dest, sha1String, cb)
{
    //file found on disk, let's check SHA1
    checksum.file(dest, function (err, sum) {
        if (sum === sha1String)
        {
            //console.log("SHA1 ok");
            cb();
        }
        else
        {
            //console.log("Need to download it " + url);
            return download(url, dest, cb);
        }
    });

}