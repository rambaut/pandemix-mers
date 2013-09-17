(function() {

    pandemix.TraitPanel = function() {
        var width, //div initial sizing. Later used to specify SVG size
            height, 
            div,
            svg,
            rowCount = 0,
            panelID = 0 + pandemix.counter,
            traits = {"No trait" : []},
            legendSize,
            rowPadding = 1,
            legendTextGap = 2,
            maxTraitNameSize = 30,
            maxRowWidth = width,
            tableHeight = height;
            
            pandemix.counter += 1;

        function drawPanel() {
            var traitTypes = [];
            for (var t in traits) {
                if (traits.hasOwnProperty(t)) {
                    traitTypes.push(t);
                }
            }


            var traitRows = svg.selectAll(".traitRow")
                               .data(traitTypes, function(d) {return d; });

            var rowEnter = traitRows.enter()
                                    .append("g")
                                    .attr("class", "traitRow")
                                    .on("click", function(d) {
                                        d3.selectAll(".traitRow").select(".traitRowBackground")
                                          .style("fill-opacity", 0);
                                        d3.select(this).select(".traitRowBackground")
                                          .style("fill-opacity", 0.125);

                                        pandemix.traitType = d;
                                        pandemix.traitValues = [];
                                        d3.select(this)
                                          .selectAll(".traitValue")
                                          .each(function(d) {
                                              if (d.selected) {
                                                  pandemix.traitValues.push(d);
                                              }
                                          });
                                       pandemix.callUpdate("traitSelectionUpdate");
                                    });

            rowEnter.append("rect")
                    .attr("class", "traitRowBackground")
                    .attr("y", -legendSize)
                    .attr("height", legendSize)
                    .attr("width", "100%")
                    .style("fill-opacity", 0);

            rowEnter.append("text")
                    .attr("dy", -1)
                    .text(function(d) {return d; });

            maxTraitNameSize = d3.max(traitRows.select("text")[0], function(d) {return d.getComputedTextLength(); });

            traitRows.attr("transform", function(d, i) {return "translate(0," + ((i + 1) * (legendSize + rowPadding)) + ")"; });

            traitRows.exit().remove();


            var traitValues = traitRows.selectAll(".traitValue")
                                       .data(function(d) {
                                            var names = traits[d];
                                            var out = [];
                                            for (var i = 0; i < names.length; i += 1) {
                                                out.push({name : names[i],
                                                          color : "hsl(" + (i * Math.floor(360 / names.length)) + ",100%,50%)",
                                                          selected : true});
                                            }
                                            return out;
                                        },
                                        function(d) {return d.name; });

            var traitEnter = traitValues.enter()
                                        .append("g")
                                        .attr("class", "traitValue")
                                        .on("click", function(d) {
                                            //console.log(d);
                                            d.selected = !d.selected;
                                            //need to update colors here because calling drawPanel would rebind the data.
                                            svg.selectAll(".traitValue").select("rect").style("fill", function(d) {
                                                if (d.selected) {
                                                    return d.color;
                                                }
                                                return "gray";
                                            });
                                        });

            traitEnter.append("rect")
                      .attr("y", -legendSize)
                      .attr("height", legendSize)
                      .attr("width", legendSize);

            traitEnter.append("text")
                      .attr("x", (legendSize + legendTextGap))
                      //.attr("dy", -1) //move text up 1 pixel
                      .text(function(d) {return d.name; });


            //every cell is a g element. Compute how to space-out
            //the cells and how much space is needed to display them
            traitRows.each(function(d) {
                var rowWidth = maxTraitNameSize;
                d3.select(this).selectAll(".traitValue").attr("transform", function() {
                    var cellSize = d3.select(this).select("text")[0][0].getComputedTextLength() + legendSize + 2 * legendTextGap;
                    rowWidth += cellSize;
                    return "translate(" + (rowWidth - cellSize) + ",0)"; 
                });
                if (rowWidth > maxRowWidth) {
                    maxRowWidth = rowWidth;
                }
            });
                       

            traitValues.select("rect").style("fill", function(d) {
                                                    if (d.selected) {
                                                        return d.color;
                                                    }
                                                    return "gray";
                                                });


            traitValues.exit().remove();

            tableHeight = traitRows.size() * (legendSize + rowPadding);

            svg.attr("width", maxRowWidth)
               .attr("height", tableHeight);

            if (maxRowWidth > width) {
                div.style("overflow-x", "scroll");
            } else {
                div.style("overflow-x", null);
            }
            if (tableHeight > height) {
                div.style("overflow-y", "scroll");
            } else {
                div.style("overflow-y", null);
            }


        };


        var panel = {
            panelType : "traitPanel",


            placePanel : function(targ) {
            div = d3.select(targ)
                    .classed("traitPanel", true);

            width = parseInt(div.style("width").replace( /\D+/, ''), 10);
            height = parseInt(div.style("height").replace( /\D+/, ''), 10);
            legendSize = parseInt(div.style("font-size").replace( /\D+/, ''), 10);

            svg = div.append("svg")
                     .attr("class", "traitSvg")
                     .attr("width", width)
                     .attr("height", height);

            //register panel for updates
            pandemix.panels.push(panel);
            },


            addTraits : function(newTraits) {
                var dirty = false,
                    i;
                for (var trait in newTraits) {
                    if (newTraits.hasOwnProperty(trait)) {
                        if (traits.hasOwnProperty(trait)) {
                            for (i = 0; i < newTraits[trait].length; i += 1) {
                                if (!pandemix.contains(traits[trait], newTraits[trait][i])) {
                                    traits[trait].push(newTraits[trait][i]);
                                    dirty = true;
                                }
                            }
                        } else {
                            traits[trait] = newTraits[trait].slice(0);
                            dirty = true;
                        }
                    }
                }
                if (dirty) {
                   drawPanel();
                }
            }
        };

        return panel;
    }

})();

































