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
    	console.log("Donneee bitch!");

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

                    var hasAlreadyPrimaryPanel = false;

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
                			
                			var pos = getPosition(style);
                			var staystr = getDataStay(slideindex, src(node).attr("stay"));

                			var content = stripContent(src(node).text());
                			
                            var newNodeStr = '';
                            if(hasAlreadyPrimaryPanel === false) {
                                newNodeStr = getPrimaryPanelString(title, content, pos.width, pos.height, staystr);
                                hasAlreadyPrimaryPanel = true;
                            } else {
                                newNodeStr = getPanelString(content, pos.width, pos.height, pos.top, staystr);
                            }
                            

                			dest(destSlides[slideindex]).append(newNodeStr);
                		});

                		src(slide).find(".nm_TextBubble").each(function(i, node) {
                			var theclass = src(node).attr("class");
                			var style = src(node).attr("style");

                			var pointer = getTransformedPointer(theclass);
                			var pos = getPosition(style);
                			var staystr = getDataStay(slideindex, src(node).attr("stay"));

                			var content = stripContent(src(node).text());

                			var newNodeStr = getPanelString(content, pos.width, pos.height, pos.top, staystr, pos.left, pointer);
                			dest(destSlides[slideindex]).append(newNodeStr);
                		});

                        src(slide).find(".nm_Image").each(function(i, node) {
                            var style = src(node).attr("style");
                            var pos = getPosition(style);
                            var staystr = getDataStay(slideindex, src(node).attr("stay"));

                            var imagesrc = src(node).attr("src");
                            var filename = path.basename(imagesrc);
                            var stripped_filename = filename.replace(/\s/g, '_');
                            var fromsource = path.join('src/_web/', imagesrc);
                            var tosource = path.join('dest/_web/images/', stripped_filename);
                            var cleaned_imagesrc = 'images/' + stripped_filename;
                            if(pos.width === null) pos.width = parseInt(src(node).attr('width'));
                            if(pos.height === null) pos.height = parseInt(src(node).attr('height'));

                            fs.copy(fromsource, tosource, function(err) {
                                if(err) console.log(err);
                                return;
                            });

                            var newNodeStr = getImageString(cleaned_imagesrc, pos.width, pos.height, pos.top, pos.left, staystr);
                            dest(destSlides[slideindex]).append(newNodeStr);
                        });

                        src(slide).find(".nm_Animation").each(function(i, node) {
                            var style = src(node).attr("style");
                            var pos = getPosition(style);
                            var staystr = getDataStay(slideindex, src(node).attr("stay"));

                            var newNodeStr = getEdgeAnimationString(pos.width, pos.height, pos.top, pos.left, staystr);

                            dest(destSlides[slideindex]).append(newNodeStr);
                        });

                        src(slide).find(".comment").each(function(i, node) {
                            var style = src(node).attr("style");
                            var pos = getPosition(style);
                            var staystr = getDataStay(slideindex, src(node).attr("stay"));
                            var content = stripContent(src(node).text());

                            var newNodeStr = getCommentString(content, pos.width, pos.height, pos.top, pos.left, staystr);
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

    function stripContent(content) {
    	if(!content) return '';
    	return content.replace(/\#([^\#]+)\#(\d+)/gi, '<a href="#" class="nm_term" data-term-id="$2">$1</a>');
    }

    function getDataStay(slideindex, stayattr) {
    	if(!stayattr) return;

    	var stayInt = parseInt(stayattr);
        var staystr = stayInt && 'data-stay="' + slideindex + '-' + (slideindex+stayInt) + '"';

        return staystr;
    }

    function getCommentString(content, width, height, top, left, datastay) {
        var uniqueId = 'nm_comment' + elementcounter;
        elementcounter++;
        var str = '<div id="' + uniqueId + '" class="comment" style="position: absolute; ' + (width ? ("width:" + width + "px; ") : "") + (height ? ("height:" + height + "px; ") : "") + 'left: ' + left + 'px; top:' + top + 'px;"' + (datastay ? " " + datastay : "") + '><p>' + content + '</p></div>';
        return str;
    }

    function getImageString(src, width, height, top, left, datastay) {
        var uniqueId = 'nm_image' + elementcounter;
        elementcounter++;
        var imgstr = '<img src="' + src + '" class="nm_image" id="' + uniqueId + '" style="position:absolute; width: ' + width +
         'px; height: ' + height + 'px; left: ' + left + 'px; top: ' + top + 'px;" width="' + width + '" height="' + height +'"' + (datastay ? " " + datastay : "") + ' />';
        
        return imgstr;
    }

    function getEdgeAnimationString(width, height, top, left, datastay) {
        var uniqueId = 'nm_edgeanimation' + elementcounter;
        elementcounter++;
        var str = '<div class="EdgeAnimation" id="' + uniqueId +'" style="position: absolute; top: ' + top + 'px; left: ' + left + 'px; width: ' + width + 'px; height: ' + height + 'px;"' + (datastay ? " " + datastay : "") + '></div>';
    
        return str;
    }

    function getTransformedPointer(classAttr) {
    	if(!classAttr) return;

    	var transformer = {
    		'bottom-middle': 'top',
    		'bottom-left': 'top-right',
    		'bottom-right': 'top-left',
    		'top-middle': 'bottom',
    		'top-left': 'bottom-right',
    		'top-right': 'bottom-left',
    		'middle-left': 'right',
    		'middle-right': 'left'
    	};

    	for(var item in transformer) {
    		if(classAttr.indexOf(item) >= 0) {
    			return transformer[item];
    		}
    	}
    }

    function getPosition(style) {
    	if(!style) return {};
    	var widthsearch = /width\:\s*(\d+)px/gi.exec(style);
		var width = widthsearch && !isNaN(widthsearch[1]) && parseInt(widthsearch[1]);
		var heightsearch = /height\:\s*(\d+)px/gi.exec(style);
		var height = heightsearch && !isNaN(heightsearch[1]) && parseInt(heightsearch[1]);
		var leftsearch = /left\:\s*(\d+)px/gi.exec(style);
		var left = leftsearch && !isNaN(leftsearch[1]) && parseInt(leftsearch[1]);
		var topsearch = /top\:\s*(\d+)px/gi.exec(style);
		var top = topsearch && !isNaN(topsearch[1]) && parseInt(topsearch[1]);

		return {
			width: width,
			height: height,
			left: left,
			top: top
		};
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

    function getPrimaryPanelString(title, content, width, height, datastay) {
    	var uniqueId = 'nm_primarypanel' + elementcounter;
    	var str = '<div id="' + uniqueId + 
    	'" class="panel panel-primary" style="width: ' + (width ? width : "300") + 'px; top:20px; height: ' + (height ? height + "px" : "auto") +'; left: 20px"' + (datastay ? " " + datastay : "") + '><div class="panel-heading"><h4 class="panel-title"><a class="panel-toggle" href="#collapse_' + uniqueId + '" data-toggle="collapse" aria-controls="collapse_' + uniqueId + '">' + 
    	title + '</a></h4></div><div id="collapse_' + 
    	uniqueId + '" class="panel-collapse collapse in" aria-expanded="true"><div class="panel-body">' + 
    	content + '</div></div></div>';
    	elementcounter++;

    	return str;
    }

    function getPanelString(content, width, height, top, datastay, left, pointer) {
    	var uniqueId = 'nm_panel' + elementcounter;
    	elementcounter++;
    	var str = '<div id="' + uniqueId + '" class="panel panel-default'+ (pointer ? " " + pointer : "") +'" style="width: ' + 
    	width + 'px; height: ' + (height ? height + "px" : "auto") +'; top:' + top + 'px; left: ' + (left ? left + 'px' : "20px") + '"' + (datastay ? " " + datastay : "") + '>' + (pointer ? '<div class="arrow"></div>' : '') + '<div class="panel-body">' +
    	 content + '</div></div>';

    	return str;
    }

})();