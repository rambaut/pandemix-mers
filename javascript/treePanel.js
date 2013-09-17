(function() {
    "use strict";
    pandemix.TreePanel = function() {
        var panelID,
            treeColor = undefined,
            cluster,
            div,
            controlPanel,
            minimize = true,
            svg,
            xScale,
            yScale,
            links, //the d3 selection
            innerNodes, //the d3 selection
            leaves,
			lastClickedLeaf,
            thisLeafSelection,
            maxHeight,
            minHeight,
            brushBox,
            timeOrigin,
            timeScale,
            axisSelection,
            aimLine,
            periodHighlight,
            extent,
            prevCoords, //previous coordinates of aim line, used when zooming
            width, //width of tree topology
            height, //height of tree topology
            marginForLabels, //additional space for labels
            horizontalPadding = 30,
            verticalPadding = 20,
            leafBackGap = 5,
            leafTextGap = 8,
            scrollBarWidth = 20,
            treeWidth, //size of tree from root node to furthest leaf
            treeHeight; //size of tree from top leaf to bottom leaf
            // padding-bottom: 20px;
            // padding-left: 35px;
            // padding-top: 20px;


            
            
        function attachLinkReferences(nodes, linkData) {
            var i, j;
            for (i = 0; i < nodes.length; i += 1) {
                for (j = 0; j < linkData[0].length; j += 1) {
                    if (nodes[i] === linkData[0][j].__data__.target) {
                        nodes[i].uplink = d3.select(linkData[0][j]);
                        break;
                    }
                }
                //nodes[i].uplink = linkData.filter(function(d) {return nodes[i] === d.target; });
            }
        };
        
        
        function getNodeLinks(nodes) {
            var links = [],
                i;
            for (i = 0; i < nodes.length; i += 1) {
                if (nodes[i].uplink) {
                    links.push(nodes[i].uplink);
                }
            }
            return links;
        };
        
        
        /*
        Modifies passed list of nodes. The parent node of two selected sibling nodes is added
        to the selection.
        */
        function addConnectingNodes(nodes) {
            var cont = true,
                i;
            while (cont) {
                cont = false;
                for (i = 0; i < nodes.length; i += 1) {
                    if (nodes[i].parent.children[0] === nodes[i]) {
                        if (contains(nodes, nodes[i].parent.children[1]) && !contains(nodes, nodes[i].parent)) {
                            nodes.push(nodes[i].parent);
                            cont = true;
                        }
                    } else {
                        if (contains(nodes, nodes[i].parent.children[0]) && !contains(nodes, nodes[i].parent)) {
                            nodes.push(nodes[i].parent);
                            cont = true;
                        }
                    }
                }
            }
        };

        /*
        Returns first common ancestor node of input list of nodes
        */
        function findCommonAncestor(_nodes) {
            var i;
            //create copy of nodes so that the input list wouldn't be altered
            var nodes = _nodes.slice(0);
            //find the smallest depth among the selected nodes
            var minDepth = Infinity;
            nodes.forEach(function(n) {
                if (n.depth < minDepth) {
                    minDepth = n.depth;
                }
            });

            //climb each node up to minDepth
            for (i = 0; i < nodes.length; i += 1) {
                while (nodes[i].depth > minDepth) {
                    nodes[i] = nodes[i].parent;
                }
            };

            //check if all nodes are the same (by comaring to first node)
            var nodesEqual = false;
            while (!nodesEqual) {
                nodesEqual = true;
                for (i = 1; i < nodes.length; i += 1) {
                    if (nodes[i] !== nodes[0]) { //climb all nodes up a level and repeat until common ancestor is found
                        for (i = 0; i < nodes.length; i += 1) {
                            nodes[i] = nodes[i].parent;
                        };
                        nodesEqual = false;
                        break;
                    }
                }
            }

            return nodes[0];
        }
        
        
        /*
        Converts a decimal year to a Date object by multiplying by number
        of milliseconds in 365.25 years.
        Zero point year corresponds to node height of 0.
        Javascript dates appear to start from 1970.
        */
        pandemix.nodeHeightToDate = function(nodeHeight, zeroPointYear) {
            return new Date((zeroPointYear - 1970 - nodeHeight) * 31557600000);
        };
        
        /*
        Reverse function of nodeHeightToDate.
        */
        pandemix.dateToNodeHeight = function(date, zeroPointYear) {
            return zeroPointYear - 1970 - date / 31557600000;
        };
        
        /*
        Used in drawing the vertical line coming from the time axis.
        */
        function drawAimLine(xPos) {
            //prevCoords = coords || prevCoords;
            aimLine.attr("x1", xPos)
                   .attr("y1", yScale(treeHeight))
                   .attr("x2", xPos)
                   .attr("y2", 0);
        };


        /*
        Draws node link.
        */
        function elbow(d) {
            return "M" + xScale(d.source.height) + "," + yScale(d.source.x)
                + "V" + yScale(d.target.x) + "H" + xScale(d.target.height);
        };


        /*
        Draws dashed link coming from leaves.
        */
        function dashedElbow(d) {
            return "M" + 0 + "," + 0
                + "h" + (xScale(d.height) - xScale(minHeight));
        };
        

        /*
        Removes the first occurance an element from an array if it is found in the array.
        */
        function removeElement(obj, array) {
            var i;
            for (i = 0; i < array.length; i += 1) {
                if (array[i].name === obj.name) {
                    array.splice(i, 1);
                    return;
                }
            }
            console.log("removable element not found");
        };


        /*
        Calculates branch scaling based on branch length.
        */
        function scaleBranchLengths(nodes, w) {
            var visitPreOrder = function(root, callback) {
                var i;
                callback(root);
                if (root.children) {
                    for (i = 0; i < root.children.length; i += 1) {
                        visitPreOrder(root.children[i], callback);
                    }
                }
            };

            visitPreOrder(nodes[0], function(node) {
                node.rootDist = (node.parent ? node.parent.rootDist : 0) + (node.length);
                var myHeight = node.height;
                var parentHeight = node.parent ? node.parent.height : 0;
                var diff = myHeight - parentHeight;
                if (diff > 0) {
                    console.log(panelID + " " + diff);
                }
                //removed 0 as the default node length. all branches should have length specified
            });
            
            //development time check for consistency between heights and lengths
            console.log(panelID + " height span " + (maxHeight - minHeight));

            var rootDists = nodes.map(function(n) { return n.rootDist; });
            
            console.log(panelID + " length span " + d3.max(rootDists));
            
            var outScale = d3.scale.linear()
                             .domain([0, d3.max(rootDists)])
                             .range([0, w]);

            return outScale;
        };
        
        
        function isMac() {
            return navigator.appVersion.indexOf("Mac")!=-1;
        }
 
        
        /*
        Topological selection mouse events.
        */
        function mDown() {
            if (pandemix.focusedPanel != panelID) {
                //clears previously highlighted links
                pandemix.selectedNodes = [];
                pandemix.callUpdate("nodeSelectionUpdate");

                //clears previously highlighted leaves
                pandemix.selectedLeaves = [];
                pandemix.callUpdate("leafSelectionUpdate");
                doNodeSelection();
            }
            pandemix.focusedPanel = panelID;

            if (d3.event.type === "touchstart") {
                extent = [d3.touches(this)[0], []];
            } else {
                extent = [d3.mouse(this), []];
            }
            d3.select(this.parentNode)
              .append("rect")
              .attr("id", "extent")
              .attr("x", extent[0][0])
              .attr("y", extent[0][1])
              .attr("width", 0)
              .attr("height", 0);
            
            //clear active time and leaf selections
            if (pandemix.brushHighlight) {
                pandemix.selectedLeaves = [];
                pandemix.selectedPeriod = [0,0];
                d3.select(".axis").call(pandemix.globalTimeBrush.clear());
                pandemix.brushHighlight.remove();
                pandemix.brushHighlight = null;
                pandemix.callUpdate("leafSelectionUpdate");
                pandemix.callUpdate("timeSelectionUpdate");
            }

            //this line needed to make selection not move like a slug!
            d3.event.preventDefault();
        };
        
        function mMove() {
            if (extent) {
                if (d3.event.type === "touchmove") {
                    extent[1] = d3.touches(brushBox.node())[0];
                } else {
                    extent[1] = d3.mouse(brushBox[0][0]);
                }
                if (extent[1][0] > xScale(minHeight)) {
                    extent[1][0] = xScale(minHeight);
                }
                if (extent[1][1] > yScale(height - 2 * verticalPadding)) {
                    extent[1][1] = yScale(height - 2 * verticalPadding);
                }
                
                d3.select("#extent")
                  .attr("x", d3.min([extent[0][0], extent[1][0]]))
                  .attr("y", d3.min([extent[0][1], extent[1][1]]))
                  .attr("width", Math.abs(extent[1][0] - extent[0][0]))
                  .attr("height", Math.abs(extent[1][1] - extent[0][1]));
            }
        };
        
        function mUp() {
            if (extent) {
                var temp,
                    selectedNodes;

                d3.select("#extent").remove();

                //transpose the two points so that extent[0] is top left
                //and extent[1] is bottom right
                if (extent[1][0] < extent[0][0]) {
                    temp = extent[0][0];
                    extent[0][0] = extent[1][0];
                    extent[1][0] = temp;
            
                }
                if (extent[1][1] < extent[0][1]) {
                    temp = extent[0][1];
                    extent[0][1] = extent[1][1];
                    extent[1][1] = temp;
                }
                selectedNodes = [];
                links.each(function(d) {
                    if (extent[1][0] > xScale(d.source.height)) { //if extent's right side is more than link's leftmost part
                        //check if any part of the link is covered in the selection extent
                        if (d.target.x > d.source.x) { //targ BELOW source
                            if (extent[0][1] < yScale(d.target.x) && 
                                (extent[1][1] > yScale(d.target.x) && extent[0][0] < xScale(d.target.height) || extent[0][0] < xScale(d.source.height) && extent[1][1] > yScale(d.source.x))) {
                                selectedNodes.push(d.target);
                            }
                        } else { //targ ABOVE source
                            if (extent[1][1] > yScale(d.target.x) &&
                                (extent[0][1] < yScale(d.target.x) && extent[0][0] < xScale(d.target.height) || extent[0][0] < xScale(d.source.height) && extent[0][1] < yScale(d.source.x))) {
                                selectedNodes.push(d.target);
                            }
                        }
                    }
                });


                if (selectedNodes.length > 1) {
                    doNodeSelection(findCommonAncestor(selectedNodes));
                } else if (selectedNodes.length === 1) {
                    doNodeSelection(selectedNodes[0]);
                } else {
                    doNodeSelection();
                }              
        
                extent = undefined;
                d3.event.preventDefault();
            }
        };
		
		
		function doNodeSelection(node) {
            if (!node) {
                if (!d3.event.shiftKey) {
                    //clears previously highlighted links
                    pandemix.selectedNodes = [];
                    pandemix.callUpdate("nodeSelectionUpdate");

                    //clears previously highlighted leaves
                    pandemix.selectedLeaves = [];
                    pandemix.callUpdate("leafSelectionUpdate");
                }
            } else {
				var selectedLeaves = getDescendingLeaves(node),
				    innerLinks,
                    i;

				//focus only on leaf nodes
                if (!d3.event.shiftKey) {
				    pandemix.selectedLeaves = selectedLeaves.slice(0);
                } else {
                    for (i = 0; i < selectedLeaves.length; i += 1) {
                        if (!pandemix.containsLeaf(pandemix.selectedLeaves, selectedLeaves[i])) {
                            pandemix.selectedLeaves.push(selectedLeaves[i]);
                        }
                    }
                }
				pandemix.callUpdate("leafSelectionUpdate");
				
				//continue this function with inner nodes as well
                innerLinks = getNodeLinks(selectedLeaves)
                            .concat(getNodeLinks(getDescendingInnerNodes(node)));
                
                if (!d3.event.shiftKey) {
                   links.classed("highlighted", false);
                }
                if (node.depth !== Infinity) {
                    for (i = 0; i < innerLinks.length; i += 1) {
                        innerLinks[i].classed("highlighted", true);
                    }
                }
            }
		};
		
		
		function getDescendingInnerNodes(node) {
			var nodeList = [];
			if (node.children) {
			    nodeList.push(node)
				for (var i = 0; i < node.children.length; i++) {
					nodeList = nodeList.concat(getDescendingInnerNodes(node.children[i]));
				}
			} 
		    return nodeList;
		}


        function attachParent(node, parent) {
            node.parent = parent;
            if (node.children) {
                for (var i = 0; i < node.children.length; i++) {
                    attachParent(node.children[i], node);
                }
            } 
        }
		
		function getDescendingLeaves(node) {
		    var nodeList = [];
			if (node.children) {
				for (var i = 0; i < node.children.length; i++) {
					nodeList = nodeList.concat(getDescendingLeaves(node.children[i]));
				}
			} else {
			    nodeList.push(node);			    
			}
		    return nodeList;
		}
    
        
        //return public methods and variables
        var panel = {
            panelType : "treePanel",


            getColor : function() {return treeColor;},


            finishedLoading : false,


            panelID : undefined,


            treeData : undefined,

            
            maxHeight : function() {return maxHeight; },

            
            minHeight : function() {return minHeight; },

            
            /*
            Create and place a container for the tree.
            */
            placePanel : function(targ) {
                panelID = 0 + pandemix.counter; //get value, not reference
                this.panelID = panelID;
                pandemix.focusedPanel = panelID;

                var parent = d3.select(targ).classed("treePanel", true);

                if (parent.classed("collapsible")) { //add control panel for collapsing the panel
                    controlPanel = parent.append("div").attr("class", "panelControl");
                    controlPanel.append("div")
                            .attr("class", "panelControl collapseButton")
                            .on("click", function() {
                                if (minimize) {
                                    div.style("display", "none");
                                } else {
                                    div.style("display", null);
                                }
                                minimize = !minimize;
                            });
                }
                                  
                div = parent.append("div")
                        .attr("class", "treePanel svgBox");

                //get size info from styling of panel
                width = parseInt(div.style("width").replace( /\D+/, ''), 10);
                height = parseInt(div.style("height").replace( /\D+/, ''), 10);

                svg = div.append("svg")
                         .attr("class", "treeTopology")
                         .attr("width", width + "px")
                         .attr("height", height + "px");

                treeWidth = width - horizontalPadding;
                treeHeight = height - 2 * verticalPadding;

                //register panel for updates
                pandemix.panels.push(panel);
                             
                pandemix.counter += 1;
            },

            
            /*
            Fill container with data.
            */
            initializePanelData : function(args) {
                var that = this;
                treeColor = args.color || (function() {
                    var treeCount = 0;
                    pandemix.panels.forEach(function(p) {
                        if (p.panelType === "treePanel") {
                            treeCount += 1;
                        }
                    });
                    //calculate one of 6 evenly spaced colors. If requirede color count is greater than 6
                    //shift the first 6 colors by 10 degrees on the color wheel and assign those.
                    //in total this gives 60 colors that can be assigned. That's already probably too much to differentiate by eye
                    return pandemix.getHSBColor(treeCount, 6, Math.floor(treeCount / 6) * 10); 
                })();

                d3.json(args.file, function(json) { //json is the parsed input object
                    var nodeArray,
                        linkArray,
                        nameLengths,
                        leafHeights,
                        i,
                        g,
                        timeAxis,
                        prop,
                        propRegex = /(.+)\.fullSet/;

                    that.treeData = json;

                    //create artificial node that exists before the root node
                    // var preRootNode = (function() {
                    //     var node = {};
                    //     for (var p in json.root) {
                    //         if (json.root.hasOwnProperty(p)) {
                    //             node[p] = undefined;
                    //         }
                    //     }
                    //     node.height = json.root.height * 1.05;
                    //     node.children = [json.root];
                    //     console.log(node);
                    //     return node;
                    // })();


                    if (controlPanel) {
                        controlPanel.append("div")
                                    .attr("class", "panelControl name")
                                    .text(json.name);
                    }
                
                
                    timeOrigin = parseFloat(json.origin);
                    //initialize d3 cluster layout
                    cluster = d3.layout.cluster()
                                .size([treeHeight, treeWidth])
                                .separation(function() {return 1; });

                    attachParent(json.root, undefined);

                    //get an array of all nodes and where they should be placed 
                    //(ignoring branch lengths)
                    nodeArray = cluster.nodes(json.root);
                    linkArray = cluster.links(nodeArray);
                    
                    leafHeights = [];
                    
                    for (i = 0; i < nodeArray.length; i += 1) {
                        if (!nodeArray[i].children) { //if leaf
                            leafHeights.push(nodeArray[i].height);
                        }
                    };
                    
                    minHeight = d3.min(leafHeights);
                    maxHeight = json.root.height;

                    linkArray.push()
                    xScale = d3.scale.linear()
                               .domain([maxHeight, minHeight])
                               .range([0, treeWidth]);


                    yScale = d3.scale.linear()
                               .domain([0, treeHeight])
                               .range([0, treeHeight]);

                    

                    var g = svg.append("g")
                               .attr("transform", "translate(" + horizontalPadding + "," + verticalPadding + ")");

                    //line that displays date selection
                    aimLine = g.append("line").attr("class", "aimLine");
                    drawAimLine(0);           

                    links = g.selectAll("path.link")
                               .data(linkArray, pandemix.getLinkKey)
                               .enter().append("path")
                               .attr("class", "link")
                               .attr("d", elbow);
                             
                    //give nodes a reference to the link leading to it
                    attachLinkReferences(nodeArray, links);

                    //assign node classification and position it
                    g.selectAll(".node")
                     .data(nodeArray, pandemix.getNodeKey)
                     .enter().append("g")
                     .attr("class", function(d) {
                         if (d.children) {
                             if (d.depth === 0) {
                                 return "root inner node";
                             }
                             return "inner node";
                         }
                         return "leaf node";
                     });
                     
                    
                    innerNodes = g.selectAll(".inner");

                    //draw root node line. It is placed inside the root nodes g so it transforms along with it.           
                    g.select(".root")
                       .append("path")
                       .attr("class", "rootLink")
                       .attr("d", function() {return "M" + 0 + "," + 0 + "h" + -20; });
                    
                    leaves = g.selectAll(".leaf");

                    var leafHeight = treeHeight / leaves.size();
                    leaves.append("text")
                          .attr("class", "leafText")
                          .attr("dx", leafTextGap)
                          .attr("text-anchor", "start")
                          .text(function(d) { return d.name; });

                    var maxLeafLength = 0;
                    leaves.each(function() {
                        var length = d3.select(this).select("text")[0][0].getComputedTextLength();
                        if (length > maxLeafLength) maxLeafLength = length;
                    });

                    treeWidth = treeWidth - leafTextGap - maxLeafLength - scrollBarWidth;
                    xScale.range([0, treeWidth]);

                    leaves.append("path")
                          .attr("class", "dashedLink")
                          .attr("d", dashedElbow);
        
                    leaves.append("rect")
                          .attr("class", "leafBack")
                          .attr("y", -leafHeight / 2)//.attr("y", -7)
                          .attr("x", leafBackGap)
                          .attr("width", maxLeafLength + leafBackGap)
                          .attr("height", leafHeight)
                          .on("click", function() {
							//three modes of click-selection:
							//no keys pressed - select clicked node, deselect everything else
							//ctrl/cmd pressed - select multiple, nonadjacent or adjacent nodes
							//shift pressed - select a range to clicked node from last clicked (ctrl or otherwise) node. deselect the rest
                              pandemix.focusedPanel = panelID;
                              var node = d3.select(this.parentNode);
                              links.classed("highlighted", false);
							  if (d3.event.metaKey || d3.event.ctrlKey) { //meta key is apple's command key
								  lastClickedLeaf = node;
							      var addNodeToSelection = !node.classed("highlighted");
                                  node.classed("highlighted", addNodeToSelection);
                                  addNodeToSelection ? pandemix.selectedLeaves.push(node.datum()) : removeElement(node.datum(), pandemix.selectedLeaves);
                                  if (addNodeToSelection) {
                                      pandemix.callUpdate("focusUpdate", node);
                                  }
							  } else if (d3.event.shiftKey) {
								  //var startNode = pandemix.selectedLeaves[pandemix.selectedLeaves.length - 1];
								  var startPos = lastClickedLeaf ? lastClickedLeaf.datum().x : 0;
								  var endPos = node.datum().x;
								  if (startPos > endPos) {
								      var temp = endPos;
									  endPos = startPos;
									  startPos = temp;
								  }
							      pandemix.selectedLeaves = [];
								  leaves.each(function(d) {
								      if (startPos <= d.x && d.x <= endPos) {
									      pandemix.selectedLeaves.push(d);
									  }
								  });
							  } else {
							      lastClickedLeaf = node;
							      pandemix.selectedLeaves = [node.datum()];
								  pandemix.callUpdate("focusUpdate", node);
							  }
							  pandemix.callUpdate("leafSelectionUpdate"); //possible to make this more incremental for better performance
                          });




                       
                    //add data to crossfilter
                    leaves.each(function (d) {
                        //tips with the same name should contain the same data
                        if (!pandemix.globalData.hasOwnProperty(d.name)) {
                            pandemix.globalData[d.name] = {"height" : d.height};
                            pandemix.taxa.add([{"name": d.name,
                                                 "date": pandemix.nodeHeightToDate(d.height, timeOrigin),
                                                 "location": d.location || ""}]);
                        }
                    });

                    //add data to traitPanel and legendPanel
                    for (i = 0; i < pandemix.panels.length; i += 1) {
                        //lookup the trait panel
                        if (pandemix.panels[i].panelType === "legendPanel") {
                            for (prop in json) {
                                if (json.hasOwnProperty(prop)) {
                                    var match = propRegex.exec(prop);
                                    if (match) {
                                       var traitDict = {};
                                       traitDict[match[1]] = json[prop].map(function(elem) {return {name: elem, color: undefined}});
                                       pandemix.panels[i].addTraits(traitDict);
                                    }
                                }
                            }
                            pandemix.panels[i].addTraits({Tree: [{name: json.name, color: treeColor}]});
                        }
                    }

                    //add data to traitSelectionPanel
                    for (i = 0; i < pandemix.panels.length; i += 1) {
                        //lookup the trait panel
                        if (pandemix.panels[i].panelType === "traitSelectionPanel") {
                            for (prop in json) {
                                if (json.hasOwnProperty(prop)) {
                                    var match = propRegex.exec(prop);
                                    if (match) {
                                       pandemix.panels[i].addTraits([match[1]]);
                                    }
                                }
                            }
                            pandemix.panels[i].addTraits(["Tree"]);
                        }
                    }
                    

                    brushBox = g.append("rect")
                                .attr("width", treeWidth)
                                .attr("height", treeHeight)
                                .attr("class", "brushBox")
                                .on("mousedown", mDown)
                                .on("touchstart", mDown)
                                .on("touchmove", mMove)
                                .on("touchend", mUp);
                                                    
                    d3.select(document).on("mousemove.treeSelect" + panelID, mMove)
                                       .on("mouseup.treeSelect" + panelID, mUp);                       
                    
                    
                    //add time axis and aim line              
                    timeScale = d3.time.scale()
                                       .domain([pandemix.nodeHeightToDate(maxHeight, timeOrigin), pandemix.nodeHeightToDate(minHeight, timeOrigin)])
                                       .range([0, treeWidth]);
                    timeScale.clamp(true);

                    timeAxis = d3.svg.axis()
                                    .scale(timeScale)
                                    .orient("bottom");

                    axisSelection = g.append("g")
                                       .attr("class", "axis")
                                       .call(timeAxis);

                    pandemix.panels.forEach(function(p) {
                        if (p.panelType === "timePanel") {
                            p.updateGlobalTimeAxis(pandemix.nodeHeightToDate(maxHeight, timeOrigin), pandemix.nodeHeightToDate(minHeight, timeOrigin));      
                        }
                    });

                    //populate node crossfilter
                    pandemix.nodes.add(nodeArray.map(function(n) {
                       return {node: n, date: pandemix.nodeHeightToDate(n.height, timeOrigin), treeID: panelID, color: treeColor}; 
                    }));

                    //populate link crossfilter
                    pandemix.links.add(linkArray.map(function(l) {
                        return {link: l, startDate: pandemix.nodeHeightToDate(l.source.height, timeOrigin), endDate: pandemix.nodeHeightToDate(l.target.height, timeOrigin), 
                                treeID: panelID, color: treeColor, treeName: json.name || ""};
                    }));

                    //position all the elements via a zoom call
                    panel.zoomUpdate();
                    that.finishedLoading = true;
                }); 
            },

        
            /*
            Saves the leaf selection and highlights selected leaves.
            */
            leafSelectionUpdate : function() {
                thisLeafSelection = leaves.filter(function(d) {                    
                    return pandemix.containsLeaf(pandemix.selectedLeaves, d);
                });
                leaves.classed("highlighted", false);
                thisLeafSelection.classed("highlighted", true);
            },


            leafColorUpdate : function(args) {
                /*if (args[1]) {
                    leaves.select("text")
                          .style("fill", function(d) {
                              if (pandemix.containsLeaf(pandemix.selectedLeaves, d)) {
                                  return args[1]; //return the color
                              }
                              return null; //remove the style
                          });
                } else {
                    leaves.select("text").style("fill", null);
                }*/     

                thisLeafSelection.select("text").style("fill", args[1]);
            },

            
            timeSelectionUpdate : function() {
                // var start = pandemix.dateToNodeHeight(pandemix.selectedPeriod[0], timeOrigin);
                // var end = pandemix.dateToNodeHeight(pandemix.selectedPeriod[1], timeOrigin);
                if (periodHighlight) {
                    //console.log(start + " " + end);
                    periodHighlight.attr("x", timeScale(pandemix.selectedPeriod[0]) || 0)
                                   .attr("width", (timeScale(pandemix.selectedPeriod[1]) - timeScale(pandemix.selectedPeriod[0])) || 0);
                } else {
                    periodHighlight = svg.select("g").append("rect")
                                         .attr("class", "timeSelection")
                                         .attr("x", timeScale(pandemix.selectedPeriod[0])) 
                                         .attr("y", 0)
                                         .attr("height", "100%")
                                         .attr("width", timeScale(pandemix.selectedPeriod[1]) - timeScale(pandemix.selectedPeriod[0]));
                }                
            },

            
            //highlights the link going up from the selected nodes
            nodeSelectionUpdate : function() {
                links.classed("highlighted", false);
                for (var i = 0; i < pandemix.selectedNodes.length; i += 1) {
                    pandemix.selectedNodes[i].uplink.classed("highlighted", true);
                }
            },


            traitSelectionUpdate : function() {
                if (pandemix.traitType && pandemix.traitValues) {
                   links.style("stroke", function(d) {
                       for (var i = 0; i < pandemix.traitValues.length; i += 1) {
                           if (d.target[pandemix.traitType] === pandemix.traitValues[i].name) {
                               return pandemix.traitValues[i].color;
                           }
                        }
                        return null;
                   });
                }
            },

        
            zoomUpdate : function() {
                yScale.range([0, treeHeight * pandemix.scale]);

                if (pandemix.scale === 1) {
                    div.style("overflow-y", "hidden");
                } else {
                    div.style("overflow-y", "auto");
                }
    
                svg.attr("height", yScale(treeHeight) + 2 * verticalPadding);
                axisSelection.attr("transform", "translate(0," + yScale(treeHeight) + ")");

                if (pandemix.selectedDate) {
                    drawAimLine(timeScale(pandemix.selectedDate)); 
                }

                brushBox.attr("height", yScale(treeHeight));
                links.attr("d", elbow);
                innerNodes.attr("transform", function(d) { return "translate(" + xScale(d.height) + "," + yScale(d.x) + ")"; });
                leaves.attr("transform", function(d) { return "translate(" + xScale(minHeight) + "," + yScale(d.x) + ")"; });

                var leafHeight = yScale(treeHeight) / leaves.size();
                svg.selectAll(".leafBack").attr("y", -leafHeight / 2).attr("height", leafHeight)
            },
        

            /*
            Scrolls viewport to the selected node.
            */
            focusUpdate : function(args) {
                if (panelID !== pandemix.focusedPanel) {
                    var nodeSelection =  leaves.filter(function(d) {return args[1].datum().name === d.name; });

                    if (!nodeSelection.empty()) {
                        div[0][0].scrollTop = yScale(nodeSelection.datum().x) - height / 2;
                    }
                }
            },


            timeSlideUpdate : function() {
                if (timeScale) {
                    drawAimLine(timeScale(pandemix.selectedDate));
                }
            }


        } //end returnable object

        return panel;
    }; //end object closure

})();







