function createV4SelectableForceDirectedGraph(svg, graph) {
    // if both d3v3 and d3v4 are loaded, we'll assume
    // that d3v4 is called d3v4, otherwise we'll assume
    // that d3v4 is the default (d3)
    if (typeof d3v4 == 'undefined')
        d3v4 = d3;

    var width = +svg.attr("width"),
        height = +svg.attr("height");

    let parentWidth = d3v4.select('svg').node().parentNode.clientWidth;
    let parentHeight = d3v4.select('svg').node().parentNode.clientHeight;

    var svg = d3v4.select('svg')
    .attr('width', parentWidth)
    .attr('height', parentHeight)

    // remove any previous graphs
    svg.selectAll('.g-main').remove();

    var gMain = svg.append('g')
    .classed('g-main', true);

    var rect = gMain.append('rect')
    .attr('width', parentWidth)
    .attr('height', parentHeight)
    .style('fill', 'white')

    var gDraw = gMain.append('g');

    var zoom = d3v4.zoom()
    .on('zoom', zoomed)

    gMain.call(zoom);


    function zoomed() {
        gDraw.attr('transform', d3v4.event.transform);
    }

    var color = d3v4.scaleOrdinal(d3v4.schemeCategory20);

    if (! ("links" in graph)) {
        console.log("Graph is missing links");
        return;
    }

    var nodes = {};
    var i;
    for (i = 0; i < graph.nodes.length; i++) {
        nodes[graph.nodes[i].data] = graph.nodes[i]["data"];
        nodes[graph.nodes[i].name] = graph.nodes[i]["value"];
        graph.nodes[i].weight = 1.01;
    }

    // the brush needs to go before the nodes so that it doesn't
    // get called when the mouse is over a node
    var gBrushHolder = gDraw.append('g');
    var gBrush = null;

    var link = gDraw.append("g")
        .attr("class", "link")
        .selectAll("line")
        .data(graph.links)
        .enter().append("line")
        .attr("stroke", function(d) {
        	if (d.weight == 2 )
        		return " red";
        	if (d.weight == 3)
        		return "yellow";
        	if (d.weight == 4 )
        		return "purple";
        	if (d.weight > 4 )
        		return "green";  });

    var node = gDraw.append("g")
        .attr("class", "node")
        .selectAll("circle")
        .data(graph.nodes)
        .enter().append("circle")
        .attr('data', function(d){ return d.data; })
        .attr("r", 5)
        .attr("fill", function(d) {
            if ('color' in d)
                return d.color;
            else
                return color(d.group);
        })
        .call(d3v4.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));


    // add titles for mouseover blurbs
    node.append("title")
        .text(function(d) {
            if ('value' in d)
                return d.value;
            else
                return d.data;
        });

   	node.on("mouseover" , function(d){
    	d3.select(this).attr("r", 10)
    });
    node.on("mouseleave", function(d){
    	d3.select(this).attr("r",5)
    }
    );

    var linkedByIndex = {};

    graph.links.forEach(function(d) {
        linkedByIndex[d.source + "," + d.target] = 1;
    });

    function isConnected(a, b) {
        return linkedByIndex[a.data + "," + b.data] || linkedByIndex[b.data + "," + a.data] || a.data == b.data;
    }

    function fade(opacity) {
        return function(d) {
            node.style("stroke-opacity", function(o) {

                let thisOpacity = isConnected(d, o) ? 1 : opacity;
                this.setAttribute('fill-opacity', thisOpacity);


                return thisOpacity;
            });
            console.log(graph.nodes[0].name);
            link.style("stroke-opacity", function(o) {

                if(o.source === d || o.target === d)
                	return 1;
                else
                	return opacity;

            });

            var node1 = document.createElement("LI");

            document.getElementById("myList").innerHTML = "PARTITIONS";

/////partnerleri yazıyor liste halinde
            graph.links.forEach(function(o){
                if(o.source == d) {
                    node1 = document.createElement("LI");
                    node1.className = "list-group-item";
////span ekledim. listenin içindeki elemana span elementi ekliyor. aynısını button şeklinde yapabilirsin.
                    span = document.createElement("span");
                    span.className = "badge";
                    span.style="color:orange";

                    var textnode1 = document.createTextNode(o.target.value);
                    var textnode2 = document.createTextNode(o.weight/2);

                    span.appendChild(textnode2);

                    node1.appendChild(textnode1);
                    node1.appendChild(span);

                    document.getElementById("myList").appendChild(node1);
                }
                if(o.target == d){
                    node1 = document.createElement("LI");
                    node1.className = "list-group-item"

                    span = document.createElement("span");
                    span.className = "badge";
                    span.style="color: orange";

                    var textnode1 = document.createTextNode(o.source.value);
                    var textnode2 = document.createTextNode(o.weight/2 );

                    span.appendChild(textnode2);

                    node1.appendChild(textnode1);
                    node1.appendChild(span);

                    document.getElementById("myList").appendChild(node1);
                }
                else{
                    //document.getElementById("myList").appendChild(node1);
                }
            });

        };
    }

    function searchNode(name){

        if( name !== null) {
            graph.nodes.forEach(function (d) {
                // noinspection JSAnnotator
                if (d.value === name) {

                    d3v4.select('circle[data="'+ d.data +'"]')
                        .dispatch('mouseover')
                        .dispatch('click');

                    return 0;
                }
                else
                    return -1;
            });
        }
    }


    node.on("click", fade(.1)).on("unclick", fade(1));

    //document.getElementById("searchButton").addEventListener('click', searchNode);


    var simulation = d3v4.forceSimulation()
        .force("link", d3v4.forceLink()
                .id(function(d) { return d.data; })
                .distance(function(d) {
                    return 30;


                    return dist;
                })
              )
        .force("charge", d3v4.forceManyBody())
        .force("center", d3v4.forceCenter(parentWidth / 2, parentHeight / 2))
        .force("x", d3v4.forceX(parentWidth/2))
        .force("y", d3v4.forceY(parentHeight/2));

    simulation
        .nodes(graph.nodes)
        .on("tick", ticked);

    simulation.force("link")
        .links(graph.links);

    function ticked() {
        // update node and line positions at every step of
        // the force simulation
        link.attr("x1", function(d) { return d.source.x; })
            .attr("y1", function(d) { return d.source.y; })
            .attr("x2", function(d) { return d.target.x; })
            .attr("y2", function(d) { return d.target.y; });

        node.attr("cx", function(d) { return d.x; })
            .attr("cy", function(d) { return d.y; });
    }

    var brushMode = false;
    var brushing = false;

    var brush = d3v4.brush()
        .on("start", brushstarted)
        .on("brush", brushed)
        .on("end", brushended);

    function brushstarted() {
        // keep track of whether we're actively brushing so that we
        // don't remove the brush on keyup in the middle of a selection
        brushing = true;

        node.each(function(d) {
            d.previouslySelected = shiftKey && d.selected;
        });
    }

    rect.on('click', () => {
        node.each(function(d) {

            if(d.selected) {
                d3v4.select('circle[data="' + d.data + '"]').dispatch('unclick');
            }
            d.selected = false;
            d.previouslySelected = false;
        });
        node.classed("selected", false);
    });

    function brushed() {
        if (!d3v4.event.sourceEvent) return;
        if (!d3v4.event.selection) return;

        var extent = d3v4.event.selection;

        node.classed("selected", function(d) {
            return d.selected = d.previouslySelected ^
            (extent[0][0] <= d.x && d.x < extent[1][0]
             && extent[0][1] <= d.y && d.y < extent[1][1]);
        });
    }

    function brushended() {
        if (!d3v4.event.sourceEvent) return;
        if (!d3v4.event.selection) return;
        if (!gBrush) return;

        gBrush.call(brush.move, null);

        if (!brushMode) {
            // the shift key has been release before we ended our brushing
            gBrush.remove();
            gBrush = null;
        }

        brushing = false;
    }

    d3v4.select('body').on('keydown', keydown);
    d3v4.select('body').on('keyup', keyup);

    var shiftKey;

    function keydown() {
        shiftKey = d3v4.event.shiftKey;

        if (shiftKey) {
            // if we already have a brush, don't do anything
            if (gBrush)
                return;

            brushMode = true;

            if (!gBrush) {
                gBrush = gBrushHolder.append('g');
                gBrush.call(brush);
            }
        }
    }

    function keyup() {
        shiftKey = false;
        brushMode = false;

        if (!gBrush)
            return;

        if (!brushing) {
            // only remove the brush if we're not actively brushing
            // otherwise it'll be removed when the brushing ends
            gBrush.remove();
            gBrush = null;
        }
    }

    function dragstarted(d) {
      if (!d3v4.event.active) simulation.alphaTarget(0.9).restart();

        if (!d.selected && !shiftKey) {
            // if this node isn't selected, then we have to unselect every other node
            node.classed("selected", function(p) { return p.selected =  p.previouslySelected = false; });
        }

        d3v4.select(this).classed("selected", function(p) { d.previouslySelected = d.selected; return d.selected = true; });

        node.filter(function(d) { return d.selected; })
        .each(function(d) { //d.fixed |= 2;
          d.fx = d.x;
          d.fy = d.y;
        })

    }

    function dragged(d) {
      //d.fx = d3v4.event.x;
      //d.fy = d3v4.event.y;
            node.filter(function(d) { return d.selected; })
            .each(function(d) {
                d.fx += d3v4.event.dx;
                d.fy += d3v4.event.dy;
            })
    }

    function dragended(d) {
      if (!d3v4.event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
        node.filter(function(d) { return d.selected; })
        .each(function(d) { //d.fixed &= ~6;
            d.fx = null;
            d.fy = null;
        })
    }

    var texts = ['Use the scroll wheel to zoom',
                 'Hold the shift key to select nodes']

    svg.selectAll('text')
        .data(texts)
        .enter()
        .append('text')
        .attr('x', 900)
        .attr('y', function(d,i) { return 470 + i * 18; })
        .text(function(d) { return d; });

    // setup autocomplete function pulling from currencies[] array

    $(function(){


        // setup autocomplete function pulling from currencies[] array
        $('#autocomplete').autocomplete({
            lookup: graph.nodes,
            onSelect: function (suggestion) {

                searchNode(suggestion.value);
            }

        }).keypress(function (e) {
            if (e.which == 13) {
                e.preventDefault();
                //do something
            }
        });


    });

    return graph;
}
