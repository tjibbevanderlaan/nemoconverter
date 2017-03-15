(function() {
	"use strict";

	var fs = require('fs-extra'),
		path = require('path'),
		async = require('async'),
	    cheerio = require('cheerio');

    var source = "./src/_web/";

    // Init dest folder
    fs.remove('/dest/', function (err) {
	  if (err) {
	    console.error(err);
	  } else {
	  	fs.copy("msk/", "dest/", function(err) {
	  		if(err) console.log(err);
	  	});
	  }
	});

    var fromList = [];
	var htmlFileList = [];
    // Read source
    fs.readdir(source, function (err, files) {
    	if(err) {
    		console.log(err);
    		return;
    	} else {
    		
    		files.forEach(function(file) {
    			if(path.extname(file) === ".html") {
    				if(getIDFromFilename(file)) {
    					fromList.push(file);
    					file = file.replace(/\s/g, '\_');
    					htmlFileList.push("dest/_web/" + file);
    				} else {
    					console.log(file + " - not valid name! This file is skipped.");
    				}

    			}
    		});

    		async.every(htmlFileList, function(newDest, callback) {
    			fs.copy("dest/_web/index.html", newDest, function(err) {
    				callback(null, !err);
    			});
			}, readHTMLSourceFiles);
    	}
	});

    function readHTMLSourceFiles(err, result) {
    	var cb = finalcallback;
    	if(err || !result) {
    		console.log('Whoops, while creating html files, some problems occured.');
    		return;
    	}
    	console.log("do dom!");

    	htmlFileList.forEach(function(file, index) {
    	// var file = htmlFileList[0];
    	// var index = 0;
    		fs.readFile(file, 'utf8', function(err, destdata) {
                if (err) return cb(err);

                fs.readFile("src/_web/" + fromList[index], 'utf-8', function(err, srcdata) {
                	if(err) return cb(err);

                	var src = cheerio.load(srcdata);
                	var dest = cheerio.load(destdata);

                	var title = src('title').text();
                	title = title.replace('.', '');
                	dest('title').text(title); 

                	var srcSlides = src('.slide').not("#commentslide");
                	var destSlides = dest('.slide');

                	srcSlides.each(function(slideindex, slide) {
                		if(!destSlides[slideindex]) {
                			dest(destSlides[slideindex-1]).after('<div class="slide"></div>');
                			destSlides = dest('.slide');
                		}

                		var panelcounter = 0;
                		var paneltopoffset = 0;
                		src(slide).find(".nm_TextField").each(function(i, node) {
                			var style = src(node).attr("style");
                			var widthsearch = /width\:\s*(\d+)px/gi.exec(style);
                			var width = widthsearch && !isNaN(widthsearch[1]) && parseInt(widthsearch[1]);
                			var heightsearch = /height\:\s*(\d+)px/gi.exec(style);
                			var height = heightsearch && !isNaN(heightsearch[1]) && parseInt(heightsearch[1]);
                			var topsearch = /top\:\s*(\d+)px/gi.exec(style);
                			var top = topsearch && !isNaN(topsearch[1]) && parseInt(topsearch[1]);
                			var stay = src(node).attr("stay") && parseInt(src(node).attr("stay"));
                			var staystr = stay && 'data-stay="' + slideindex + '-' + (slideindex+stay) + '"';

                			var content = src(node).text();
                			content = content.replace(/\#([^\#]+)\#(\d+)/gi, '<a href="#" class="nm_term" data-term-id="$2">$1</a>');
                			

                			var newNodeStr = getPanelString(content,width, height, top, staystr);

                			dest(destSlides[slideindex]).append(newNodeStr);
                		});
                	});

                	var newDocument = dest.html();
                	fs.writeFile(file, newDocument, 'utf8', function(err) {
                		if(err) console.log(err);
                	});

                });
            });
    	});
    }

    function finalcallback(err) {
    	console.log(finalcallback);
    }


    function getIDFromFilename(filename) {
        var patt = /\d{3,}[^\d]+(\d{2,3})/;
        var results = patt.exec(filename);
        if (results !== null && results[1]) {
            var str = results[1];
            var result = parseInt(str);
            if (!isNaN(result)) return result;
        }
        return -1;
    }

    var elementcounter = 0;

    function getPrimaryPanelString(title, content, datastay) {
    	var uniqueId = 'nm_primarypanel' + elementcounter;
    	var str = '<div id="' + uniqueId + 
    	'" class="panel panel-primary" style="width: 300px; top:20px; height: auto; left: 20px"' + (datastay ? " " + datastay : "") + '><div class="panel-heading"><h4 class="panel-title"><a class="panel-toggle" href="#collapse_' + uniqueId + '" data-toggle="collapse" aria-controls="collapse_' + uniqueId + '">' + 
    	title + '</a></h4></div><div id="collapse_' + 
    	uniqueId + '" class="panel-collapse collapse in" aria-expanded="true"><div class="panel-body">' + 
    	content + '</div></div></div>';
    	elementcounter++;

    	return str;
    }

    function getPanelString(content, width, height, top, datastay) {
    	var uniqueId = 'nm_panel' + elementcounter;
    	elementcounter++;
    	var str = '<div id="' + uniqueId + '" class="panel panel-default" style="width: ' + 
    	width + 'px; height: ' + (height ? height + "px" : "auto") +'; top:' + top + 'px; left: 20px"' + (datastay ? " " + datastay : "") + '><div class="panel-body">' +
    	 content + '</div></div>';

    	return str;
    }

})();