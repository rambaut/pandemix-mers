(function() {

    pandemix.MapPanel = function() {
        var map,
            bounds = [[-180, -90], [180, 90]],
            layers = [],
            layerControl,
            mapData = undefined,
            centroids = {};
            contoursLoaded = false,
            centroidsLoaded = false,
            previousSelectedDate = undefined,
            panelID = 0 + pandemix.counter,
            zCounter = 10, //leaflet adds some of its own layers so counter starts at 10 to make sure the new ones are on top
            info = undefined;

        pandemix.counter += 1;


        var panel = {
            panelType: "mapPanel",

            placePanel: function(args) {
                var initC = args.initCoords || [0, 0];
                var initZ = args.initZoom || 4;
                map = new L.Map(args.target, {
                    center: initC,
                    zoom: initZ,
                    maxBounds: [[-90, -180], [90, 180]]
                });
                layerControl = L.control.layers(null, null).addTo(map);

                //register panel for updates
                pandemix.panels.push(panel);
                
                return panel;
            },

            //begin loading map file and return immediately
            loadContours: function(dataFile) {
                var that = this;
                d3.json(dataFile, function(json) {
                    var path = d3.geo.path().projection(that.project);
                    mapData = json; //save a reference to the parsed contour file for use with layers
                    // bounds = d3.geo.bounds(mapData);
                    // //TODO: add that check for latitude as well if needed
                    // if (bounds[1][0] < bounds[0][0]) { //if true, the area has crossed the antimeridian
                    //     //set the bounds to span the entire map
                    //     bounds[0][0] = -180;
                    //     bounds[1][0] = 180;
                    // }
                    
                    contoursLoaded = true;
                });
                return panel;
            },

            loadCentroids: function(dataFile) {
                var that = this;
                if (!dataFile) { //then calculate from the contours
                    pandemix.when(function() {return contoursLoaded; },
                                function() {
                                    var path = d3.geo.path().projection(that.project);
                                    for (var i = 0; i < mapData.features.length; i++) {
                                        var centroid = path.centroid(mapData.features[i]);
                                        if (centroid) {
                                            centroid = map.layerPointToLatLng(new L.Point(centroid[0], centroid[1]));
                                            centroids[mapData.features[i].properties.name] = [centroid.lng, centroid.lat];
                                        }
                                    }
                                    centroidsLoaded = true;
                                },
                                100);
                } else {
                    d3.csv(dataFile, function(csv) {
                        csv.forEach(function(entry) {
                            centroids[entry.location] = [entry.longitude, entry.latitude];
                        });

                        centroidsLoaded = true;
                    });
                } 
                return panel;
            },

            addTileLayer: function(source) {
                var l = new L.TileLayer(source, {
                                 noWrap: true,
                                 zIndex: zCounter
                });
                zCounter += 1;
                map.addLayer(l);
                layerControl.addOverlay(l, "Tiles");
                return panel;
            },

            addLayer: function(layer, args) {
                var that = this;
                var args = args || {};
                if (!args.zIndex) {
                    args.zIndex = zCounter;
                    zCounter += 1;
                }
                
                var l = new layer();
                pandemix.when(function() {var out = true;
                                          if (l.needsContours) out = out && contoursLoaded;
                                          if (l.needsCentroids) out = out && centroidsLoaded;
                                          if (l.needsTrees) out = out && pandemix.panelsLoaded("treePanel");
                                          return out; },
                               function() {
                                    var layerName = "layer";
                                    if (args.name) {
                                        layerName = args.name;
                                    } else if (l.needsTrees) {
                                        layerName = args.treePanel.treeData.name;
                                    }

                                    args.map = map;
                                    args.project = that.project;
                                    args.bounds = bounds;
                                    args.mapData = mapData;
                                    args.centroids = centroids;
                                    layerControl.addOverlay(l, layerName);
                                    l.initDraw(args);
                                    map.addLayer(l);
                                    layers.push(l);
                               },
                               100);
                return panel;
            },

            addInfoDisplay: function(updPattern) {
                info = L.control({position: 'bottomleft'});

                info.onAdd = function(map) {
                    this.div = L.DomUtil.create('div', 'info');
                    return this.div;
                };
                info.update = updPattern;

                info.addTo(map);

                return panel;
            },

            getMap: function() {
                return map;
            },

            leafSelectionUpdate: function() {
                var selectedRegions = [],
                    i;

                for (i = 0; i < pandemix.selectedLeaves.length; i += 1) {
                    if (!pandemix.contains(selectedRegions, pandemix.selectedLeaves[i].location)) {
                        selectedRegions.push(pandemix.selectedLeaves[i].location);
                    }
                }

                for (i = 0; i < layers.length; i += 1) {
                    //use this instead of hasOwnProperty because layer functions get stored in the prototype by leaflet
                    if ("leafSelectionUpdate" in layers[i]) {
                        layers[i].leafSelectionUpdate(selectedRegions);
                    }
                }
            },

            mapLegendUpdate: function() {
                if (info) {
                    if (arguments[0].length > 1) {
                        info.div.innerHTML = info.update(arguments[0][1]);
                    } else {
                        info.div.innerHTML = "";
                    }
                }
            },

            timeSelectionUpdate: function() {
                // var start = new Date().getTime();
                // var filteredNodes = undefined;
                // for (i = 0; i < layers.length; i += 1) {
                //     //use this instead of hasOwnProperty because layer functions get stored in the prototype by leaflet
                //     if ("timeSelectionUpdate" in layers[i]) {
                //         if (!filteredNodes) {
                //             filteredNodes = pandemix.nodeDateDim.filterRange(pandemix.selectedPeriod).top(Infinity);
                //         }
                //         layers[i].timeSelectionUpdate(filteredNodes);
                //     }
                // }

                // this.times.push(new Date().getTime() - start);
                // if (this.times.length === 100)  {
                //     console.log("avg execution time: ", d3.mean(this.times));
                //     this.times = [];
                // }
            },

            timeSlideUpdate: function() {
                var date = pandemix.selectedDate;
                var filteredNodes = undefined;
                var movingForward = undefined;

                //decide if scrobbler is moving forward or backward in time
                if (!previousSelectedDate) {
                    movingForward = true;

                } else {
                    movingForward = previousSelectedDate < date;
                }
                previousSelectedDate = new Date(date.getTime());

                //override if this was specified by the update call
                if (arguments[0].length > 1) {
                    movingForward = arguments[0][1];
                }
                

                for (i = 0; i < layers.length; i += 1) {
                    //use this instead of hasOwnProperty because layer functions get stored in the prototype by leaflet
                    if ("timeSlideUpdate" in layers[i]) {
                        if (!filteredNodes) {
                            pandemix.linkStartDateDim.filter(function(d) {return d < date; });
                            var filteredLinks = pandemix.linkEndDateDim.filter(function(d) {return d >= date; }).top(Infinity);
                        }
                        layers[i].timeSlideUpdate(filteredLinks, movingForward);
                    }
                }

            },

            traitSelectionUpdate: function() {
                for (var i = 0; i < layers.length; i += 1) {
                    if ("traitSelectionUpdate" in layers[i]) {
                        layers[i].traitSelectionUpdate();
                    }
                }
            },

            project: function(x) {
                var point = map.latLngToLayerPoint([x[1], x[0]]); //new L.LatLng(x[1], x[0])
                return [point.x, point.y];
            }
        };

        return panel;
    }

})();


















