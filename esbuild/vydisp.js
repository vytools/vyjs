import { setup_generic_map } from "./js/generic_map.js";
import * as DF from "./js/definition_form.js";

export function setup(VYD) {
  let SIM = null;
  VYD.FOLLOW = false;
  VYD.PLAYBACK_SPEED_GEAR = 1;
  const CONFIGDIV = document.querySelector('#configure');
  const HELPDIV = document.querySelector('#help');
  const TOOLBAR = document.querySelector('div.toolbar');
  const SPEEDBTN = TOOLBAR.querySelector('button.speed');
  VYD.TIMEBTN = TOOLBAR.querySelector('button.time');
  const MAPDIV = document.querySelector('#map1');
  VYD.MAPFUNCS = setup_generic_map(MAPDIV, VYD.DRAWDATA, VYD.DRAWEXT);
  const PLAYICON = document.querySelector('svg.bi-play');
  const PAUSICON = document.querySelector('svg.bi-pause');
  const SAVEBTN = document.querySelector('button.saveconfig');

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
    } else if (b.classList.contains('help')) {
      HELPDIV.style.display = (HELPDIV.style.display == '') ? 'none' : '';
      ev.target.classList.toggle('btn-dark');
      ev.target.classList.toggle('btn-light');
    } else if (b.classList.contains('configure')) {
      CONFIGDIV.style.display = (CONFIGDIV.style.display == '') ? 'none' : '';
      ev.target.classList.toggle('btn-dark');
      ev.target.classList.toggle('btn-light');
    } else if (b.classList.contains('loadresults')) {
      LOADINPUT.click();
    }
  });

  VYD.alert = function(msg, timeout) {
    const el = document.createElement('div');
    el.className = 'alert alert-primary d-flex align-items-center';
    el.setAttribute('role', 'alert');
    el.innerHTML = `<svg class="bi flex-shrink-0 me-2" width="24" height="24" role="img" aria-label="Danger:"><use xlink:href="#exclamation-triangle-fill"/></svg><div>${msg}</div>`;
    document.querySelector('div.alerts').appendChild(el);
    setTimeout(() => { el.remove(); }, timeout*1000);
  }

  const load_results = function(data) {
    try {
      DEFFORM.reload(data);
      VYD.set_vyrslts([data]);
    } catch(err) {
      alert(`Failed to parse vyrslts.json. Is the syntax correct? ${err}`,8);
    }
  }

  const LOADINPUT = document.createElement('input');
  LOADINPUT.type = 'file';
  LOADINPUT.accept = '.json';
  LOADINPUT.style.display = 'none';
  document.body.appendChild(LOADINPUT);
  LOADINPUT.addEventListener('change', (e) => {
    if (!e.target.files || !e.target.files.length) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      load_results(JSON.parse(ev.target.result))
    };
    reader.readAsText(e.target.files[0]);
    LOADINPUT.value = '';
  });
  SAVEBTN.addEventListener('click',(e) => {
    if (VYD.defobj && VYD.defobj.object && VYD.defobj.object.config) {
      let c = VYD.defobj.object.config;
      console.log('VYD.IS_VS_CODE',VYD.IS_VS_CODE,'VYD.IS_ONLINE',VYD.IS_ONLINE)
      if (VYD.IS_ONLINE) {
        let data = {'pblc.share_data.config':c};
        if (c.max_solve_time) {
          data['prvt.submit_data.max_run_time'] = c.max_solve_time + 5;
        }
        window.parent.postMessage({topic:'save', data},'*');
      } else if (VYD.IS_VS_CODE) {
        window.parent.postMessage({topic:'save_vycnfig', data:c},'*');
      } else {
        let filename = prompt('Download to:','vycnfig.json')
        if (!filename) return;
        DF.download(filename,c);
      }
    }
  });

  const set_vytools_data = function(data) {
    if (!data) return;
    if (data.hasOwnProperty('is_online')) VYD.IS_ONLINE = data.is_online;
    if (data.hasOwnProperty('is_vs_code')) VYD.IS_VS_CODE = data.is_vs_code;
    document.querySelector('button.loadresults').style.display = (VYD.IS_ONLINE) ? 'none' : '';
    VYD.LEVL = data.levl;
    if (VYD.IS_ONLINE && VYD.LEVL == 0) {
      document.querySelector('button.configure').style.display = 'none'
      CONFIGDIV.style.display = 'none';
    }
    if (data.vycnfig) DEFFORM.reload({config:data.vycnfig});
    if (data.vyrslts) VYD.set_vyrslts(data.vyrslts);
  }

  window.addEventListener('message',function(e) {
    try {
      console.log('** vydisp.js received',e.data);
      if (e.data.message) alert(e.data.message,8);
      if (e.source == window.parent && e.data.topic == 'results_json') {
        // data is the parsed contents of vyrslts.json.
        // It should match the defobj.top schema and usually has a field "config".
        // DEFFORM.reload expects the full top-level object; 
        // VYD.set_vyrslts receives it as a single-item array.
        load_results(e.data.data);
      } else if (e.source == window.parent && e.data.topic == 'tool_data' && e.data.data) {
        set_vytools_data(e.data.data);
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
      if (typ == undefined && path == '_' && !obj.hasOwnProperty('config')) { // Loading from vycnfig
        output = {config:obj};
      }
      if (path == '_') { // Loaded top level (could be after loaded from file)
      }
      return output;
    }
  }

  if (!VYD.defobj.functions.on_save_item) {
    VYD.defobj.functions.on_save_item = function(typ, path, obj) {
      window.parent.postMessage({topic:'download_tool_data',type:typ,obj},'*');  
    }
  }
  let DEFFORM = {};
  
  VYD.fin = () => {
    VYD.IS_ONLINE = false;
    VYD.IS_VS_CODE = false;
    window.parent.postMessage({topic:'request_tool_data'},'*');
    set_vytools_data(window.TOOL_DATA);  
  }

  if (!VYD.hasOwnProperty('TIME')) VYD.TIME = 0;
  VYD.check_time = (MAX_TIME, TIME_STEP) => {
    let MIN_TIME = 0;
    if (VYD.TIMEBTN) VYD.TIMEBTN.innerText = VYD.TIME.toFixed(2)+' sec';
    let keepgoing = 
      (VYD.TIME < MAX_TIME || (VYD.TIME == MAX_TIME && VYD.PLAYBACK_SPEED_GEAR < 0)) && 
      (VYD.TIME > MIN_TIME || (VYD.TIME == MIN_TIME && VYD.PLAYBACK_SPEED_GEAR > 0));
    VYD.TIME += VYD.PLAYBACK_SPEED_GEAR*TIME_STEP;
    VYD.TIME = Math.max(MIN_TIME, Math.min(MAX_TIME, VYD.TIME));
    return keepgoing;
  }

  try {
    DEFFORM = DF.init(document.querySelector('#params'), VYD.defobj);
    VYD.defobj.reload = DEFFORM.reload;
  } catch (err) {
    let msg = `Failed to initialize definitions: ${err}`;
    alert(msg, 8);
    throw new Error(msg);
  }
  try {
    VYD.defobj.reload(VYD.defobj.object);
  } catch (err) {
    let msg = `Failed to load default object: ${err}: ${JSON.stringify(VYD.defobj.object,null,2)}`;
    alert(msg, 8);
    throw new Error(msg);
  }
}

window.TOOL_DATA=null;
