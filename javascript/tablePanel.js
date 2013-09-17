(function() {

    pandemix.TablePanel = function() {
        var width = 200,
            height = 300,
            div,
            svg,
            rowCount = 0,
            panelID = 0 + pandemix.counter;
            
            pandemix.counter += 1;

        var panel = {
            panelType : "tablePanel",
            
            leafSelectionUpdate : function() {
                var nodes = pandemix.selectedLeaves;
                var rows = svg.selectAll(".tableRow")
                              .data(nodes, pandemix.getNodeKey);

                rows.exit().remove();
                
                rows.enter()
                    .append("g")
                    .attr("class", "tableRow")
                    .append("text") 
                    .text(function(d) {return d.name; });

                rows.call(function() {
                    var i = 0;
                    this.attr("transform", function() {
                        i += 1;
                        return "translate(0," + (10 * (i)) + ")"; 
                    });
                });
                    
                var rowCount = rows.size();
                if (rowCount < height / 10) {
                    rowCount = height / 10; 
                }
                svg.attr("height", rowCount * 10);
            },
                
            placePanel : function(targ) {
            div = d3.select(targ)
                    .attr("class", "tableBox")
                    .style("width", width + "px")
                    .style("height", height + "px")
                    .style("float", "right")
                    .style("border", "1px solid")
                    .style("overflow", "scroll");

            svg = div.append("svg")
                     .attr("class", "tablePanel")
                     .attr("width", width)
                     .attr("height", height);

            //register panel for updates
            pandemix.panels.push(panel);
            }
        }

        return panel;

    };

})();