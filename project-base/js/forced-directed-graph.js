
// common variables

var filterDegree = 0;
var filterWeight = 0;
var filterNumOfPrj = 0;
var filterCost = 0;
var filteredNodes = [];
var maxWeight = 0;
var maxDegree = 0;
var maxNumOfPrj = 0;
var maxTotalCost = 0;
var isFirstTime = true;
var nodesToFilter;
var projectArray = [];


/**
 * A function to draw the graph
 */
function drawGraph() {
    var svg = d3.select('#d3_selectable_force_directed_graph');
    var checkboxValues = [document.querySelector('.weight-filter').checked, document.querySelector('.projectno-filter').checked,
        document.querySelector('.numOfPrj-filter').checked, document.querySelector('.cost-filter').checked,];
    d3.json('json/database_test.json', function (error, graph) {
        if (!error) {
            if(isFirstTime){
                graph.links.forEach(function (a) {
                    if (maxWeight < a.weight)
                        maxWeight = a.weight;
                });
                graph.nodes.forEach(function (a) {
                    if (maxDegree < a.baglanti)
                        maxDegree = a.baglanti;
                    if (maxNumOfPrj < a.kackez)
                        maxNumOfPrj = a.kackez;

                });
                graph.projects.forEach(function (element) {
                    if (maxTotalCost < element.totalcost)
                        maxTotalCost = element.totalcost;
                });
                document.getElementById("chosenWeight").max= maxWeight/ 2;
                document.getElementById("chosenDegree").max= maxDegree;
                document.getElementById("chosenNumOfPrj").max= maxNumOfPrj;
                document.getElementById("chosenPrjCost").max = maxTotalCost;
                isFirstTime = false;
            }
            else {
                nodesToFilter = Array.apply(null, Array(graph.nodes.length)).map(function () {
                });

                if (checkboxValues[0])
                    graph = filterByWeight(graph);
                if (checkboxValues[1])
                    graph = filterByDegree(graph);
                if (checkboxValues[2])
                    graph = filterByNumOfPrj(graph);
                if (checkboxValues[3])
                    graph = filterByTotalCost(graph);
                if (projectArray.length)
                    graph = filterByProject(projectArray, graph);

                createV4SelectableForceDirectedGraph(svg, graph);
            }
        }

        else {
            console.error(error);
        }
    });
}

/**
 * The function that draws the graph and creates the simulation and its functionality
 * @param svg
 * @param graph
 * @returns {{links}|Object}
 */
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
        		return "grey";
        	if (d.weight == 4)
        		return "yellow";
        	if (d.weight == 6 )
        		return "purple";
        	if (d.weight > 6 )
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

    /**
     * A function to check the two nodes are connected or not by looking up the linkedByIndex array
     * @param a node object to check connection
     * @param b node object to check connection
     * @returns true, if the given nodes are connected by a link or they are same; false if not
     */
    function isConnected(a, b) {
        return linkedByIndex[a.data + "," + b.data] || linkedByIndex[b.data + "," + a.data] || a.data == b.data;
    }

    /**
     * A function to simulate a fade effect to the non-neighbour nodes of clicked object and create a list
     * of neighbours to the focused node.
     * @param opacity a value to specify the fade rate [0,1]
     * @returns {Function} a function object that can be used as event for node.on actions
     */
    function fade(opacity) {
        return function(d) {

            // empty the list to fill with the clicked nodes neighbours
            $("ul").empty();

            node.style("stroke-opacity", function(o) {

                let thisOpacity = isConnected(d, o) ? 1 : opacity;
                this.setAttribute('fill-opacity', thisOpacity);


                return thisOpacity;
            });

            document.getElementById("name").innerHTML = d.value;
            document.getElementById("country").innerHTML = d.country;
            document.getElementById("type").innerHTML = d.activity;
            document.getElementById("num-of-prj").innerHTML = d.kackez;
            document.getElementById("connections").innerHTML = d.baglanti;
            
            //show the partner list of the clicked node and adjust link opacity clicking node
            var node1 = document.createElement("LI");

            link.style("stroke-opacity", function(o) {

                if(o.source === d){
                    node1 = document.createElement("LI");
                    node1.className = "list-group-item d-flex justify-content-between align-items-center";
                    var span = document.createElement("span");
                    span.className = "badge badge-pill badge-info";
                    span.style= "font-size: 10px;";
                    span.title ="Number of project between the companies";
                    var textnode1 = document.createTextNode(o.target.value);
                    var textnode2 = document.createTextNode(o.weight/2);
                    span.appendChild(textnode2);
                    
                    var p = document.createElement("p");
                    p.style = "margin-bottom: 0px; padding-right: auto; font-size: 15px";
                    p.appendChild(textnode1);
                    node1.appendChild(p);
                    

                    createGoButton(node1, function(){
                        console.log("button" + this);
                        searchAndClick(o.target.value);
                    });
                    node1.appendChild(span);
                    
                    document.getElementById("myList").appendChild(node1);

                	return 1;
                }
                if(o.target === d){
                    node1 = document.createElement("LI");
                    node1.className = "list-group-item d-flex justify-content-between align-items-center";
                    var span = document.createElement("span");
                    span.className = "badge badge-pill badge-info";
                    span.style= "font-size: 10px;";
                    span.title ="Number of projects between the companies";
                    var textnode1 = document.createTextNode(o.source.value);
                    var textnode2 = document.createTextNode(o.weight/2);
                    span.appendChild(textnode2);
                    

                    var p = document.createElement("p");
                    p.style = " margin-bottom: 0px; padding-right: auto; font-size: 15px";
                    p.appendChild(textnode1);
                    node1.appendChild(p);
                    

                    createGoButton(node1, function(){
                        console.log("button" + this);
                        searchAndClick(o.source.value);
                    });
                    node1.appendChild(span);
                    
                    document.getElementById("myList").appendChild(node1);

                    return 1;
                }
                else
                	return opacity;

            });


            ////sorting the list according to number of the list element.
            //// **begin with biggest**
            var list, i, switching, b, shouldSwitch;
            list = document.getElementById("myList");
            switching = true;

            while(switching){
                switching = false;
                b=list.getElementsByTagName("li");

                for (var i = 0; i < (b.length-1); i++) {
                    shouldSwitch = false;
                    if (Number(b[i].lastElementChild.innerHTML) < Number(b[i + 1].lastElementChild.innerHTML)) {
                        /*if next item is numerically
                        bigger than current item, mark as a switch
                        and break the loop:*/
                        shouldSwitch = true;
                        break;
                    }
                }
                if (shouldSwitch) {
                    /*If a switch has been marked, make the switch
                    and mark the switch as done:*/
                    b[0].parentNode.insertBefore(b[i + 1], b[i]);
                    switching = true;
                }
            }

        };
    }

    /**
     * A function to create a "GO!" button under specified html tag
     * @param context the tag that will have that button under itsel
     * @param func the function that will be evoked when button onclick
     */
    function createGoButton(context, func){
        var button = document.createElement("button");
        var span = document.createElement("span");
        span.className = "";
        button.type = "button";
        span.innerHTML = "Go!";
        span.style = "font-size: 10px";
        button.title = "Click to go this company";
        button.className = "btn btn-xs btn-info";
        button.style = "margin-right: 10px; margin-left:auto; padding-right: auto";
        button.appendChild(span);
        button.onclick = func;
        context.appendChild(button);
    }

    /**
     * A function to search the node on graph and click it for autocomplete functionality
     * @param name the name of the node to search
     */
    function searchAndClick(name){

        if( name !== null) {
            graph.nodes.forEach(function (d) {
                // noinspection JSAnnotator
                if (d.value === name) {
                    d3v4.selectAll('circle').dispatch('mouseleave');
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

    // bonds the interactions of mouse events with nodes
    node.on("click", fade(.1)).on("unclick", fade(1));



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
            $("ul").empty();
            document.getElementById("isim").innerHTML = "NAME";
            document.getElementById("country").innerHTML = "COUNTRY";
            document.getElementById("type").innerHTML = "ACTIVITY TYPE";
            document.getElementById("kac").innerHTML = "# PROJECTS";
            document.getElementById("connections").innerHTML = "# CONNECTIONS";
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
        $('#autocompleteCompanies').autocomplete({
            lookup: graph.nodes,
            onSelect: function (suggestion) {

                searchAndClick(suggestion.value);
            }

        }).keypress(function (e) {
            if (e.which == 13) {
                e.preventDefault();
                //do something
            }
        });

        $('#autocompleteProjects').autocomplete({

            lookup: graph.projects,
            onSelect: function (suggestion) {
                drawGraph();
                projectArray = suggestion.pro_nodes;
                if(document.getElementById("cancelPrjName").children.length === 1) {
                    var button = document.createElement("button");
                    var span = document.createElement("span");
                    span.className = "";
                    span.innerHTML = "X";
                    span.style ="font-size: 10px";
                    button.type = "button";
                    button.style = "margin-right: 10px; margin-left:auto; padding-right: auto";
                    button.className = "btn btn-primary btn-danger";
                    button.appendChild(span);
                    button.onclick = function () {
                        projectArray = [];
                        drawGraph();
                        document.getElementById("cancelPrjName").removeChild(button);
                    };
                    document.getElementById("cancelPrjName").appendChild(button);
                }
            }

        }).keypress(function (e) {
            if (e.which == 13) {
                e.preventDefault();
                //do something
            }
        });
        $('#autocompleteCall').autocomplete({
            lookup: graph.pro_codes,
            onSelect: function (suggestion) {
                drawGraph();
                projectArray = suggestion.co_nodes;
                if(document.getElementById("cancelCallCode").children.length === 1) {
                    var button = document.createElement("button");
                    var span = document.createElement("span");
                    span.className = "";
                    span.innerHTML = "X";
                    span.style ="font-size: 10px";
                    button.type = "button";
                    button.style = "margin-right: 10px; margin-left:auto; padding-right: auto"
                    button.className = "btn btn-primary btn-danger";
                    button.appendChild(span);
                    button.onclick = function () {
                        projectArray = [];
                        drawGraph();
                        document.getElementById("cancelCallCode").removeChild(button);
                    };
                    document.getElementById("cancelCallCode").appendChild(button);
                }
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

/**
 * A function to filter the graph object's links and nodes by the link weight between nodes
 * @param graph The graph object to filter in the function
 * @returns filtered graph object by weight
 */
function filterByWeight(graph){
    filterWeight = document.getElementById("chosenWeight").value * 2;

    if(filterWeight) {
        filteredNodes = [];

        graph.links = graph.links.filter(function (a) {

            if (a.weight >= filterWeight) {
                nodesToFilter[a.source - 1] = 1;
                nodesToFilter[a.target - 1] = 1;
                return true;
            }
            return false;
        });

        for (var k = 0; k < nodesToFilter.length; k++) {
            if (nodesToFilter[k] === 1) {
                filteredNodes.push(graph.nodes.find(function (r) {
                    if (maxDegree < r.baglanti)
                        maxDegree = r.baglanti;
                    return r.data === k+1;
                }));

            }
        }
        graph.nodes = filteredNodes;
        document.getElementById("chosenDegree").max= maxDegree;
        maxDegree = 1;


    }
    return graph;
}

/**
 * A function to filter the graph object's links and nodes by the degree of the nodes
 * @param graph The graph object to filter in the function
 * @returns filtered graph object by degree of nodes
 */
function filterByDegree(graph){
    filterDegree = document.getElementById("chosenDegree").value;
    if(filterDegree) {

        graph.nodes = graph.nodes.filter(function (a) {
            return a.baglanti >= filterDegree;
        });
        graph.links = graph.links.filter(function (a) {
            if (graph.nodes.findIndex(function (r){
                return a.source === r.data;
            }) === -1)
                return false;
            else if (graph.nodes.findIndex(function (r){
                return a.target === r.data;
            }) === -1)
                return false;
            return true;
        });
    }
    return graph;
}
/**
 * A function to filter the graph object's links and nodes by the number of the projects that company nodes in
 * @param graph The graph object to filter in the function
 * @returns filtered graph object by the number of projects that company nodes in
 */
function filterByNumOfPrj(graph){
    filterNumOfPrj= document.getElementById("chosenNumOfPrj").value;
    if(filterNumOfPrj) {

        graph.nodes = graph.nodes.filter(function (a) {
            return a.kackez >= filterNumOfPrj;
        });
        graph.links = graph.links.filter(function (a) {
            if (graph.nodes.findIndex(function (r){
                return a.source === r.data;
            }) === -1)
                return false;
            else if (graph.nodes.findIndex(function (r){
                return a.target === r.data;
            }) === -1)
                return false;
            return true;
        });
    }
    return graph;
}
/**
 * A function to filter the graph object's links and nodes by the given projects' node array
 * @param graph The graph object to filter in the function
 * @returns filtered graph object by the given projects' node array
 */
function filterByProject(projectArray, graph){
    graph.nodes = graph.nodes.filter(function (a) {
        if(projectArray.findIndex(function (r) {
            return a.data === r;
        }) !== -1)
            return true;
        return false;
    });
    graph.links = graph.links.filter(function (a) {
        if (graph.nodes.findIndex(function (r){
            return a.source === r.data;
        }) === -1)
            return false;
        else if (graph.nodes.findIndex(function (r){
            return a.target === r.data;
        }) === -1)
            return false;
        return true;
    });
    return graph;
}

function filterByTotalCost(graph){
    filterCost = document.getElementById("chosenPrjCost").value;

    if(filterCost) {
        graph.projects = graph.projects.filter(function (a) {
            return a.totalcost >= filterCost;
        });
    }
    return graph;
}