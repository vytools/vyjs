export function setup_playback(parentNode, callback) {
  let data = {endtime:0,currenttime:0,speed:1,playing:false};
  const id = 'playback'+Math.random().toString(36).slice(2);
  const html = `
  <div id="${id}">
    <div class="progress" style="transition:none;border-radius: 0 !important;height:10px">
      <div id="progress" class="progress-bar progress-bar-striped bg-danger" role="progressbar" style="width: 25%;transition-duration:0s"></div>
    </div>
    <div class="input-group input-group-sm mb-3"  style="border-radius: 0 !important;">
      <span class="input-group-text" style="border-radius: 0 !important;">Speed</span>
      <input type="text" class="form-control speed" value="1">
      <span class="input-group-text">Time</span>
      <span class="input-group-text currenttime">0</span>
      <input type="text" class="form-control time" value="0">
      <span class="input-group-text Restart">&lt;&lt;</span>
      <span class="input-group-text Play" style="border-radius: 0 !important;">&gt;</span>
    </div>
  </div>`;
  parentNode.insertAdjacentHTML('beforeend', html);
  let top = parentNode.querySelector('#'+id);

  function play() {
    let icon = top.querySelector('span.Play'); //.querySelector('i');
    top.querySelector('#progress').classList.add('progress-bar-animated');
    top.querySelector('span.Play')
    icon.innerText = '||'; // icon.classList.remove("fa-play");
    // icon.classList.add("fa-pause");
    data.playing = true;
    if (data.currenttime >= data.endtime) data.currenttime = 0;
    run();
  }
  
  function pause() {
    let icon = top.querySelector('span.Play'); //.querySelector('i');
    top.querySelector('#progress').classList.remove('progress-bar-animated');
    icon.innerText = '>'; // icon.classList.remove("fa-pause");
    // icon.classList.add("fa-play");
    
    data.playing = false;
  } 
  
  function update() {
    let prcnt = (data.endtime!==0) ? data.currenttime/data.endtime*100 : 0;
    top.querySelector('#progress').style.width = Math.max(0,Math.min(prcnt,100))+'%';
    top.querySelector('span.currenttime').textContent = data.currenttime.toFixed(3);
  }

  top.querySelector('input.time').addEventListener('keypress', function (evt) {
    var key = evt.which || evt.keyCode;
    if (key === 13) {
      let time = parseFloat(this.value);
      if (time) data.currenttime = time;
      update();
      if (!data.playing) run();
    }
  });

  top.querySelector('input.speed').addEventListener('keypress', function (evt) {
    var key = evt.which || evt.keyCode;
    if (key === 13) {
      let speed = parseFloat(this.value);
      if (speed) data.speed = speed;
    }
  });

  top.querySelector('div.progress').addEventListener('click',function(evt) {
    let rect = evt.target.getBoundingClientRect();
    let offsetX = evt.clientX - rect.left;
    let offsetY = evt.clientY - rect.top;    
    let prcnt = offsetX/this.clientWidth;
    data.currenttime = prcnt*data.endtime;
    update();
  }); 
  
  top.querySelector('span.Play').addEventListener('click',function() {
    if (data.playing) { pause(); } else { play(); } 
  }); 

  top.querySelector('span.Restart').addEventListener('click',function() {
    data.currenttime = 0;
    update();
  });
  update();
  
  const dt = 0.03; // 30ms - 33.33 hz
  function run() {
    if (data.endtime <= 0) {
      data.playing = false;
    } else {
      data.currenttime += dt*data.speed;
      if (data.currenttime > data.endtime) data.playing = false;
      update();
      callback(data.currenttime);
    }
    if (data.playing) { setTimeout(run,dt*1000) } else { pause(); };
  }
  
  data.setter = function(datain) {
    for (var name in datain) { 
      if (data.hasOwnProperty(name)) data[name] = datain[name];
    }
    if (datain.hasOwnProperty('playing')) run();
  }

  return data;

}
