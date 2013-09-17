(function() {

    pandemix.TraitSelectionPanel = function() {
        var width, //div initial sizing. Later used to specify SVG size
            height, 
            div,
            svg,
            rowCount = 0,
            panelID = 0 + pandemix.counter,
            traits = ["No trait"],
            legendSize,
            rowPadding = 1,
            legendTextGap = 2;
            
            pandemix.counter += 1;

        function drawPanel() {
            var traitRows = svg.selectAll(".traitRow")
                               .data(traits, function(d) {return d; });

            var rowEnter = traitRows.enter()
                                    .append("g")
                                    .attr("class", "traitRow")
                                    .on("click", function(d) {
                                        svg.selectAll(".traitRow").select(".traitRowBackground")
                                          .classed("selected", false)
                                        d3.select(this).select(".traitRowBackground")
                                          .classed("selected", true)

                                        pandemix.selectTrait(d);
                                    });

            rowEnter.append("rect")
                    .attr("class", "traitRowBackground")
                    .attr("y", -legendSize)
                    .attr("height", legendSize)
                    .attr("width", "100%");

            rowEnter.select(".traitRowBackground").classed("selected", function(d) {return d === "No trait"; });

            rowEnter.append("text")
                    .attr("class", "traitRowText")
                    .attr("dy", -1)
                    .text(function(d) {return d; });

            traitRows.attr("transform", function(d, i) {return "translate(0," + ((i + 1) * (legendSize + rowPadding)) + ")"; });

            traitRows.exit().remove();
        };


        var panel = {
            panelType : "traitSelectionPanel",


            placePanel : function(args) {
            div = d3.select(args.target)
                    .classed("traitSelectionPanel", true);

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
                    i,
                    e;
                for (i = 0; i < newTraits.length; i += 1) {
                    var foundTrait = false;
                    for (e = 0; e < traits.length; e += 1) {
                        if (traits[e] === newTraits[i]) {
                            foundTrait = true;
                            break;
                        }
                    }
                    if (!foundTrait) {
                        traits.push(newTraits[i]);
                        dirty = true;
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

































