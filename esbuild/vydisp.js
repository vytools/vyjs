import { setup_generic_map } from "./js/generic_map.js";
import * as DF from "./js/definition_form.js";

export function setup(VYD) {

  let SIM = null;
  VYD.FOLLOW = false;
  VYD.PLAYBACK_SPEED_GEAR = 1;
  const HELPDIV = document.querySelector('#help');
  const TOOLBAR = document.querySelector('div.toolbar');
  const SPEEDBTN = TOOLBAR.querySelector('button.speed');
  VYD.TIMEBTN = TOOLBAR.querySelector('button.time');
  const MAPDIV = document.querySelector('#map1');
  VYD.MAPFUNCS = setup_generic_map(MAPDIV, VYD.DRAWDATA, VYD.DRAWEXT);
  const PLAYICON = document.querySelector('svg.bi-play');
  const PAUSICON = document.querySelector('svg.bi-pause');

  const switch_direction = () => {
      VYD.PLAYBACK_SPEED_GEAR = -VYD.PLAYBACK_SPEED_GEAR;
      if (VYD.PLAYBACK_SPEED_GEAR > 0) {
        [PLAYICON,PAUSICON].forEach(b => {
          b.classList.remove('flip');
          b.classList.add('black');
        });
      } else {
        [PLAYICON,PAUSICON].forEach(b => {
          b.classList.remove('black');
          b.classList.add('flip');
        });
      }
  }
  const toggle_play_pause = () => {
    if (!SIM) {
      indicate_(true);
      SIM = setInterval(() => {
        if (!VYD.step()) {
          if (VYD.PLAYBACK_SPEED_GEAR < 0) switch_direction();
          indicate_(false);
          clearInterval(SIM);
          SIM = null;
        }
      },50);
    } else {
      indicate_(false);
      clearInterval(SIM);
      SIM = null;
    }    
  }

  MAPDIV.addEventListener('mousedown', (ev) => {
    SPEEDBTN.style.display = 'none';
    if (ev.detail == 2 && ev.shiftKey) toggle_play_pause();
    if (ev.detail == 2 && ev.ctrlKey) switch_direction();
    VYD.DRAWDATA.disable_map_events = false;
  });
  MAPDIV.addEventListener('wheel', (ev) => {
    if (ev.shiftKey) {
      VYD.DRAWDATA.disable_map_events = true;
      let sgn = (VYD.PLAYBACK_SPEED_GEAR > 0) ? 1 : -1
      VYD.PLAYBACK_SPEED_GEAR = sgn*Math.min(100, Math.max(0.001, sgn*VYD.PLAYBACK_SPEED_GEAR*((ev.deltaY > 0) ? 0.8 : 1.2)));
      SPEEDBTN.innerText = 'speed: '+VYD.PLAYBACK_SPEED_GEAR.toFixed(3);
      SPEEDBTN.style.display = '';
      ev.stopPropagation();
      ev.preventDefault();
    } else {
      VYD.DRAWDATA.disable_map_events = false;
    }
  },{capture:true});

  const tog_ = (b,to_dark) => {
    b.classList.add((to_dark) ? 'btn-dark' : 'btn-light');
    b.classList.remove((!to_dark) ? 'btn-dark' : 'btn-light');
  }
  const indicate_ = (pause) => {
    PAUSICON.style.display = (!pause) ? 'none' : '';
    PLAYICON.style.display = (!pause) ? '' : 'none';
  }

  TOOLBAR.addEventListener('click',async (ev)=>{
    let b = ev.target.closest('button');
    if (b.classList.contains('follow')) {
      VYD.FOLLOW = !VYD.FOLLOW;
      tog_(b, VYD.FOLLOW);
    } else if (b.classList.contains('playpause')) {
      toggle_play_pause();
    } else if (b.classList.contains('restart')) {
      VYD.restart();
    }
  });

  document.querySelector('button.help').addEventListener('click',ev => {
    HELPDIV.style.display = (HELPDIV.style.display == '') ? 'none' : '';
    ev.target.classList.toggle('btn-dark');
    ev.target.classList.toggle('btn-light');
  });

  const alert = function(msg, timeout) {
    document.querySelector('div.alerts').innerHTML = 
      `<div class="alert alert-danger d-flex align-items-center" role="alert">
        <svg class="bi flex-shrink-0 me-2" width="24" height="24" role="img" aria-label="Danger:"><use xlink:href="#exclamation-triangle-fill"/></svg>
        <div>${msg}</div>
      </div>`;
    setTimeout(() => { document.querySelector('div.alerts').innerHTML=''; }, timeout*1000);
  }

  const set_vytools_data = function(data) {
    let pblc = data.pblc;
    let child_results = data.child_results;
    let entries = [];
    if (child_results && child_results.length > 0) {
      entries = child_results;
    } else if (pblc && pblc.run_results && pblc.run_results.results) {
      entries.push(pblc.run_results.results);
    } else if (pblc) {
      let cnfg = (pblc.share_data && pblc.share_data.config) ? pblc.share_data.config : null;
      entries.push({config:cnfg});
    }
    if (entries && entries.length > 0) {
      DEFFORM.reload(entries[0]);
      VYD.set_entries(entries);
    }
  }

  window.addEventListener('message',function(e) {
    try {
      if (e.source == window.parent && e.data.topic == 'results_json') {
          console.log('** Received "results_json" message',e.data.data);
        try {
          DEFFORM.reload(e.data.data);
        } catch(err) {
          alert(`Failed to parse results.vy.json. Is the syntax correct? ${err}`,8);
        }
      } else if (e.source == window.parent && e.data.topic == 'child_results') {
          console.log('** Received "child_results" message');
      } else if (e.source == window.parent && e.data.topic == 'tool_data' && e.data.data) {
        console.log('** Received "tool_data" message',e.data.data);
        if (e.data.data && e.data.data.pblc) set_vytools_data(e.data.data);
      } else {
        console.log('window.addEventListener ignoring message: ', e.data);
      }
    } catch(err) {
      alert(`Failed to interpret message: ${err}`,8);
    }
  });

  if (!VYD.defobj.functions) VYD.defobj.functions = {};

  if (!VYD.defobj.functions.on_load) {
    VYD.defobj.functions.on_load = function(typ, path, obj) {
      let output = obj;
      if (typ == undefined && path == '_') { // Loading from file
        if (obj.hasOwnProperty('config')) { // Loading results
          console.log('** Attempting to load "results.vy.json" from file')
        } else {
          console.log('** Attempting to load "config.vy.json" from file')
          output = {config:obj};
        }
      } else if (path == '_') { // Loaded top level (could be after loaded from file)
      }
      return output;
    }
  }

  if (!VYD.defobj.functions.on_save_item) {
    VYD.defobj.functions.on_save_item = function(typ, path, obj) {
      if (path == '_') {
        window.parent.postMessage({topic:'save', data:{'pblc.share_data.config':obj.config}},'*');
      } else {
        window.parent.postMessage({topic:'save_to_file', data:{data:obj,defintion:typ}},'*');
        // if (filename) DF.download(filename,{data:obj,defintion:typ});
      }
    }
  }

  const DEFFORM = DF.init(document.querySelector('#params'), VYD.defobj);
  DEFFORM.reload(VYD.defobj.object);
  return {set_vytools_data};
}
