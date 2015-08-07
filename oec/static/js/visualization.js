// WARNING: Do not edit the contents of this file. It is compiled dynamically
// from multiple source files located in the assets/js directory.

var configs = {};

var visualization = function(build) {

  var trade_flow = build.trade_flow,
      default_config = configs["default"](build),
      viz_config = configs[build.viz.slug](build);

  var viz_height = window.innerHeight;
  var viz_width = window.innerWidth;

  var viz = d3plus.viz()
              .config(default_config)
              .config(viz_config)
              .height(viz_height)
              .width(viz_width);

  /* need to grab json network file for rings and product space */
  if(build.viz.slug == "network" || build.viz.slug == "rings"){
    viz.nodes("/static/json/network_hs.json", function(network){
      viz.edges(network.edges);
      return network.nodes;
    })
  }
  
  /* Need to set text formatting in HTML for translations */
  viz.format({"text": function(text, key, vars){
      if(key){
        if(key.key == "display_id"){ return text.toUpperCase(); }
      }
      if(text){
        if(text == "display_id"){ 
          if(build.attr_type == "origin" || build.attr_type == "dest"){
            return oec.translations["id"];
          }
          else {
            return build.attr_type.toUpperCase() + " ID";
          }
        }

        if(d3.keys(oec.translations).indexOf(text) > -1){
          return oec.translations[text];
        }

        if(text.indexOf("Values") >= 0 && !key){
          return trade_flow.charAt(0).toUpperCase() + trade_flow.substr(1).toLowerCase() + " " + text;
        }

        return d3plus.string.title(text, key, vars);
      }
    }
  })

  var q = queue()
              .defer(d3.json, build.data_url)
              .defer(d3.json, build.attr_url);

  /* unleash the dogs... make the AJAX requests in order to the server and when
     they return execute the go() func */
  q.await(function(error, raw_data, raw_attrs){
    
    var attrs = format_attrs(raw_attrs, build)
    var data = format_data(raw_data, attrs, build)
  
    viz.data(raw_data.data).attrs(attrs).draw();
    
    d3.select("#loading")
      .style("display", "none")

    d3.select("#viz")
      .style("display", "block")
  
  });
  
  return viz;

}

function share(){
  var lang = build.lang;
  var same_origin = window.parent.location.host == window.location.host;
  var url = encodeURIComponent(window.location.pathname + "?lang="+lang)
  if(same_origin){
    if(window.location != window.parent.location){
      var url = encodeURIComponent(window.parent.location.pathname + "?lang="+lang)
    }
  }
  // make post request to server for short URL
  d3.json("/"+lang+"/explore/shorten/")
    .header("Content-type","application/x-www-form-urlencoded")
    .post("url="+url, function(error, data) {
      if (data.error) {
        console.log(data.error)
      }
      else{
        d3.select("#short").style("display", "block")
        d3.selectAll(".modal#share input.short_url").property("value", "http://"+location.host+"/"+data.slug)
      }
    })
  // open modal window
  d3.selectAll(".modal#share").classed("active", true)
}

configs.default = function(build) {
  
  /*  If we're looking at countries their icons are flags and we don't
      want to show the colored background because the flags don't take up
      100% of the icon square. 
  
      Also we want to show RCA if we're looking at products. */
  if(build.attr_type == "dest" || build.attr_type == "origin"){
    var icon = {"value":"icon", "style":{"nest":"knockout","id":"default"}};
    var id_nesting = ["nest", "id"];
    var tooltip = ["display_id", build.trade_flow+"_val"];
  }
  else {
    var icon = {"value":"icon", "style":"knockout"};
    var id_nesting = ["nest", "nest_mid", "id"];
    var tooltip = ["display_id", build.trade_flow+"_val", build.trade_flow+"_rca"]
  }
  
  return {
    "aggs": {
      "export_val_growth_pct": "mean",
      "export_val_growth_pct_5": "mean",
      "export_val_growth_val": "mean",
      "export_val_growth_val_5": "mean",
      "import_val_growth_pct": "mean",
      "import_val_growth_pct_5": "mean",
      "import_val_growth_val": "mean",
      "import_val_growth_val_5": "mean",
      "distance": "mean",
      "opp_gain": "mean",
      "pci": "mean",
      "eci": "mean",
      "export_rca": "mean",
      "import_rca": "mean"
    },
    "background": "none",
    "color": { "heatmap": ["#cccccc","#0085BF"] },
    "container": "#viz",
    "focus": {"tooltip": false},
    "format": {
      "number": function( number , key , vars ){
        var key = key.key;
        if(key && key.index){
          if(key.indexOf("pct") > -1){ return d3.format(".2%")(number); }
          if(key == "year"){ return number; }
        }
        var ret = d3plus.number.format( number , {"key":key, "vars":vars})
        if (key && ["export_val","import_val","net_export_val","net_import_val"].indexOf(key) >= 0) {
          ret = "$"+ret
        }
        return ret
      }
    },
    "icon": icon,
    "id": id_nesting,
    "legend": {"filters":true},
    "messages": {"branding": true},
    "size": {
      "value": build.trade_flow+"_val",
      "threshold": false
    },
    "text": ["name", "display_id"],
    "time": {"value": "year", "solo": build.year },
    "tooltip": { "small": 225 },
    "tooltip": tooltip,
    "type": build.viz.slug
  }

}

configs.geo_map = function(build) {
  return {
    "color": build.trade_flow+"_val",
    "coords": {
      "center": [10,0],
      "padding": 0,
      "mute": ["anata"],
      "value": "/static/json/country_coords.json"
    },
    "depth": 1,
    "size": "export_val",
    "x": "eci",
    "y": {
      "scale": "log",
      "value": build.trade_flow
    },
    "ui": [
      {"method":show_all_years, "value":["Show all years"], "type":"button"},
      {"method":"color", "value": [
        {"Value": build.trade_flow+"_val"},
        {"Annual Growth Rate (1 year)": build.trade_flow+"_val_growth_pct"},
        {"Annual Growth Rate (5 year)": build.trade_flow+"_val_growth_pct_5"},
        {"Growth Value (1 year)": build.trade_flow+"_val_growth_val"},
        {"Growth Value (5 year)": build.trade_flow+"_val_growth_val_5"},
      ]},
      {"method":share, "value":["Share"], "type":"button"}
    ]
  }
}

configs.line = function(build) {
  return {
    "color": "id",
    "depth": 1,
    "x": "year",
    "y": "trade",
    "ui": [{"method":share, "value":["Share"], "type":"button"}]
  }
}

configs.network = function(build) {
  return {
    "active": {
      "value": function(d){
        return d.export_rca >= 1;
      },
      "spotlight":true      
    },
    "color": "color",
    "depth": 1,
    // "edges": {
    //     "value": "/static/json/just_edges.json",
    //     "callback": function(network){
    //       return network.edges
    //     }
    // },
    "id": ["nest","id"],
    "nodes": {
      "overlap": 1.1,
    },
    // "nodes": {
    //   "overlap": 1.1,
    //   "value": {
    //     "value": "/static/json/just_nodes.json",
    //     "callback": function(network){
    //       return network.nodes
    //     }
    //   }
    // },
    "size": "export_val",
    "ui": [{"method":share, "value":["Share"], "type":"button"}]
  }
}

configs.rings = function(build) {
  return {
    "active": {
      "value": function(d){
        return d.export_rca >= 1;
      },
      "spotlight":true      
    },
    "color": "color",
    "focus": build.prod.id,
    "id": ["nest","id"],
    "depth": 1,
    "size": "export_val",
    "ui": [{"method":share, "value":["Share"], "type":"button"}]
  }
}

configs.scatter = function(build) {
  return {
    "color": "color",
    "depth": 1,
    "size": "export_val",
    "x": "eci",
    "y": {
      "scale": "log",
      "value": build.trade_flow
    },
    "ui": [{"method":share, "value":["Share"], "type":"button"}]
  }
}

configs.stacked = function(build) {
  function change_layout(new_layout){
    viz.y({"scale": new_layout}).draw();
  }
  
  if(build.attr_type == "dest" || build.attr_type == "origin"){
    var depth_ui = {"method":"depth", "value":[{"Continent": 0}, {"Country":1}], "label":"Depth"}
  }
  else {
    var depth_ui = {"method":"depth", "value":[{"HS2": 0}, {"HS4":1}], "label":"Depth"}
  }
  
  return {
    "depth": 1,
    "shape": "area",
    "x": "year",
    "y": {"scale": "linear"},
    "color": "color",
    "order": "nest",
    "ui": [
      depth_ui,
      {"method":change_layout, "value":[{"Value": "linear"}, {"Share": "share"}], "label":"Layout"},
      {"method":share, "value":["Share"], "type":"button"}
    ]
  }
}


function show_all_years(){
  // remove show all years ui element
  var ui = viz.ui().filter(function(u){
    return u.value[0] != "Show all years"
  })
  
  // hide viz and show "loading"
  d3.select("#viz").style("display", "none");
  d3.select("#loading").style("display", "block");
  
  // reformat data url aka replace current year with "all"
  var data_url = build.data_url;
  data_url = data_url.split("/");
  data_url[3] = "all";
  data_url = data_url.join("/");
  
  var q = queue()
    .defer(d3.json, data_url)
    .defer(d3.json, build.attr_url)
    .await(function(error, raw_data, raw_attrs){
  
      var attrs = format_attrs(raw_attrs, build)
      var data = format_data(raw_data, attrs, build)
     
      viz.data(raw_data.data).attrs(attrs).ui(ui).draw();
      
      d3.select("#viz").style("display", "block");
      d3.select("#loading").style("display", "none");

    });

}
configs.tree_map = function(build) {
  if(build.attr_type == "dest" || build.attr_type == "origin"){
    var depth_ui = {"method":"depth", "value":[{"Continent": 0}, {"Country":1}], "label":"Depth"}
  }
  else {
    var depth_ui = {"method":"depth", "value":[{"HS2": 0}, {"HS4":1}, {"HS6":2}], "label":"Depth"}
  }
  
  return {
    "depth": 1,
    "shape": "square",
    "labels": {"align": "start", "valign":"top"},
    "color": "color",
    "zoom": false,
    "ui": [
      depth_ui,
      {"method":show_all_years, "value":["Show all years"], "type":"button"},
      {"method":"color", "value": [
        {"Category": "color"},
        {"Annual Growth Rate (1 year)": build.trade_flow+"_growth_pct"},
        {"Annual Growth Rate (5 year)": build.trade_flow+"_growth_pct_5"},
        {"Growth Value (1 year)": build.trade_flow+"_growth_val"},
        {"Growth Value (5 year)": build.trade_flow+"_growth_val_5"},
      ]},
      {"method":share, "value":["Share"], "type":"button"}
    ]
  }
}

function format_data(raw_data, attrs, build){
  
  var data = raw_data.data;
  var opposite_trade_flow = build.trade_flow == "export" ? "import" : "export";
  var attr_id = attr_id = build.attr_type + "_id";
  
  // go through raw data and set each items nest and id vars properly
  // also calculate net values
  data.forEach(function(d){
    d.nest = d[attr_id].substr(0, 2)
    if(attr_id.indexOf("hs") == 0){
      d.nest_mid = d[attr_id].substr(0, 6)
    }
    d.id = d[attr_id]
    var net_val = parseFloat(d[build.trade_flow+"_val"]) - parseFloat(d[opposite_trade_flow+"_val"]);
    if(net_val > 0){
      d["net_"+build.trade_flow+"_val"] = net_val;
    }
  })
  
  // special case for line chart of trade balance (need to duplicate data)
  if(build.viz.slug == "line"){
    data = data.map(function(d){
      d.trade = d.export_val;
      d.id = d.id + "_export";
      d.name = "Exports";
      return d;
    })
    var clones = data.map(function(d){
      var x = JSON.parse(JSON.stringify(d));
      x.trade = x.import_val;
      x.id = x.id + "_import";
      x.name = "Imports"
      return x;
    })
    data = data.concat(clones);
  }
  
  return data;
  
}

function format_attrs(raw_attrs, build){
  var attrs = {};
  var attr_id = attr_id = build.attr_type + "_id";
  
  raw_attrs.data.forEach(function(d){
    attrs[d.id] = d
    if(attr_id == "origin_id" || attr_id == "dest_id"){
      attrs[d.id]["icon"] = "/static/img/icons/country/country_"+d.id+".png"
    }
    else if(attr_id.indexOf("hs") == 0){
      attrs[d.id]["icon"] = "/static/img/icons/hs/hs_"+d.id.substr(0, 2)+".png"
    }
    else if(attr_id == "sitc_id"){
      attrs[d.id]["icon"] = "/static/img/icons/sitc/sitc_"+d.id.substr(0, 2)+".png"
    }
  })
  
  // for geo map, get rid of small island nations that don't exist
  // in geography
  if(build.viz.slug == "geo_map"){
    delete attrs["octkl"]
    delete attrs["octon"]
    delete attrs["ocwlf"]
    delete attrs["ocwsm"]
  }
  
  return attrs;
}
var load = function(url, callback) {

  localforage.getItem("cache_version", function(error, c){

    if (c !== cache_version) {
      localforage.clear();
      localforage.setItem("cache_version", cache_version, loadUrl);
    }
    else {
      loadUrl();
    }

    function loadUrl() {

      localforage.getItem(url, function(error, data) {

        if (data) {
          callback(data);
        }
        else {
          d3.json(url, function(error, data){
            localforage.setItem(url, data);
            callback(data);
          })
        }

      });

    }

  });

}