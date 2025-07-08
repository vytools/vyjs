const native = {
    "bool":{type:"checkbox", default:false, cl:"form-check-input d_f_d_chk", attributes:'', op:x=>x},
    "string":{type:"text", default:'', cl:"form-control", attributes:'', op: x=>x},
    "float32":{type:"number", default:0, cl:"form-control", attributes:'step="any"', op:parseFloat},
    "float64":{type:"number", default:0, cl:"form-control", attributes:'step="any"', op:parseFloat},
    "int16":{type:"number", default:0, cl:"form-control", attributes:'step:"1" min="-32768" max="32767"', op:parseInt},
    "uint16":{type:"number", default:0, cl:"form-control", attributes:'step:"1" min="0" max="32767"', op:parseInt},
    "int8":{type:"number", default:0, cl:"form-control", attributes:'step:"1" min="-128" max="127"', op:parseInt},
    "uint8":{type:"number", default:0, cl:"form-control", attributes:'step:"1" min="0" max="255"', op:parseInt},
    "int32":{type:"number", default:0, cl:"form-control", attributes:'step:"1"', op:parseInt},
    "uint32":{type:"number", default:0, cl:"form-control", attributes:'step:"1" min="0"', op:parseInt},
}
const INITIALCHAR = '_';

const isObject = function(item) {
    return (item && typeof item === 'object' && !Array.isArray(item));
}
   
export function merge_deep(target, ...sources) {
    if (!sources.length) return target;
    const source = sources.shift();
    if (isObject(target) && isObject(source)) {
        for (const key in source) {
            if (isObject(source[key])) {
                if (!target[key]) Object.assign(target, { [key]: {} });
                target[key] = merge_deep(target[key], source[key]);
            } else {
                Object.assign(target, { [key]: source[key] });
            }
        }
    } else if (isObject(source)) {
        return source;
    }
    return merge_deep(target, ...sources);
}

const save_upload_buttons = function(accumulated_name, vertical, deletable, isnative) {
    let vrt = (vertical) ? "d_f_d_pt" : "";
    let sname = accumulated_name.replace(INITIALCHAR+'.','');
    let dbut = (!deletable) ? '' : 
        `<button class="btn d_f_d_xs ${vrt} btn-dark d_f_d_act" title="Remove ${sname}" data-rmv="${accumulated_name}">-</button>`;
    if (!isnative) {
        let snam = (sname == '_') ? "all data" : "'"+sname+"'";
        return `<button class="btn d_f_d_xs ${vrt} btn-dark d_f_d_act" title="Upload json file replacement for ${snam}. If you don't know the format for this file, the easiest way to see what it is is to use this interface to populate some values, then click the down button to download and then examine the json file containing the data you entered." data-upl="${accumulated_name}">&uarr;</button>
                <button class="btn d_f_d_xs ${vrt} btn-dark d_f_d_act" title="Download ${snam} to a json file" data-sav="${accumulated_name}">&darr;</button>` + dbut;
    } else {
        return dbut;
    }
}

const expand_label = function(label) {
    if (label) {
        return `<button class="btn d_f_d_e btn-dark" title="Expand/collapse this field">${label}</button>`;
    } else {
        return '';
    }
}

const create_fields = function(topcontainer, definitions, topdef, obj, accumulated_name, deletable, hide_fields) {
    let toplevel = accumulated_name == INITIALCHAR;
    let isdeleteable = deletable >= 0;
    let isnative = native.hasOwnProperty(topdef.type);
    let isindef = definitions.hasOwnProperty(topdef.type);
    let labl = (isdeleteable || toplevel) ? 
        `<div style="display:flex;flex-flow:column">${save_upload_buttons(accumulated_name, true, isdeleteable, isnative)}</div>` : '';
    if (isnative) {
        let n = native[topdef.type];
        topcontainer.classList.add('row');
        let val = (obj == null) ? n.default : obj;
        let valstr = (topdef.type != 'bool') ? ` value="${val}"` : (val) ? ' checked' : ' ';
        let inp = `<div class="col-sm-6 col-form-label-sm" title="${topdef.description || ''}">`;
        if (topdef.hasOwnProperty('options')) {
            let options = topdef.options.map(opt => `<option value="${opt}" ${(opt==val) ? 'selected' : ''}>${opt}</option>`).join('');
            inp += `<select data-ntyp="${topdef.type}" data-pth="${accumulated_name}" class="form-control-sm ${n.cl}">${options}</select></div>`;
        } else {
            inp += `<input type="${n.type}" data-ntyp="${topdef.type}" data-pth="${accumulated_name}" class="form-control-sm ${n.cl}" ${n.attributes} ${valstr}></div>`;
        }
        let lablname = (isdeleteable) ? '' : (topdef.name || '');
        let txt = `<label class="col-sm-6" title="${topdef.description || ''}">${labl + lablname}</label>${inp}`
        topcontainer.insertAdjacentHTML('beforeend',txt);
    } else if (isindef) {
        topcontainer.insertAdjacentHTML('beforeend',`<div class="d_f_d_0"><div class="d_f_d_1">${labl}</div><div class="d_f_d_2"></div></div>`);
        let nodes = topcontainer.querySelectorAll('div.d_f_d_2');
        let container = nodes[nodes.length-1];
        let keys = definitions[topdef.type].map(d => d.name);
        if (obj && typeof(obj) == 'object') {
            Object.keys(obj).forEach(key => {
                if (keys.indexOf(key) == -1) delete obj[key];
            })
        }
        definitions[topdef.type].forEach(d => {
            let isarray = d.hasOwnProperty('length');
            let val = (obj != null && obj.hasOwnProperty(d.name)) ? obj[d.name] : null;
            let n = 0, unlimited = d.length == '?';
            let accname = accumulated_name + '.' + d.name;
            let subcontainer = container;
            if (hide_fields.filter(ig => accname.match(ig)).length == 0) {
                if (definitions.hasOwnProperty(d.type) || isarray) {
                    let svup = (isarray) ? '' : save_upload_buttons(accname,false)+'&nbsp;';
                    let nn = ((unlimited) ? '<button class="btn d_f_d_xs btn-dark d_f_d_a">+</button>&nbsp;' : '') + svup + expand_label(d.name);
                    container.insertAdjacentHTML('beforeend',`<label class="d_f_d_t" data-name="${accname}">${nn}</label>
                    <div class="d_f_d_s hide" data-name="${accname}"></div>`);
                    subcontainer = container.querySelector(`div[data-name='${accname}']`);
                }
                if (isarray) {
                    if (val == null) val = []
                    n = parseInt(d.length) || val.length;
                    if (isNaN(parseInt(d.length)) && d.length != '?') {
                        subcontainer.insertAdjacentHTML('beforeend',`<p>Problem with ${JSON.stringify(d)}`);
                    } else {
                        for (var ii = 0; ii < n; ii++) {
                            create_fields(subcontainer, definitions, d, (val.length > ii) ? val[ii] : null,accname + '.' + ii,(unlimited) ? ii : -1, hide_fields);
                        }
                    }
                } else {
                    create_fields(subcontainer, definitions, d, val, accname, -1, hide_fields);
                }
            }
        });
    } else {
        console.log('Failed to find type: '+topdef)
        topcontainer.insertAdjacentHTML('beforeend','<pre>'+topdef+': '+JSON.stringify(obj,null,2)+'</pre>');
    }
}

const toggle_visibility = function(li,toggle) {
    if (li) {
        let div = li.closest('div').querySelector(`div[data-name='${li.dataset.name}']`);
        if (div) { if (toggle) { div.classList.toggle("hide"); } else { div.classList.remove("hide");} }
    }
}

export function create_object_of_type(optdef, definitions) {
    if (native.hasOwnProperty(optdef.type)) {
        if (optdef.hasOwnProperty('default')) {
            return optdef.default;
        } else if (optdef.hasOwnProperty('options') && optdef.options.length>0) {
            return optdef.options[0];
        } else {
            return native[optdef.type].default;
        }
    } else if (definitions.hasOwnProperty(optdef.type)) {
        let obj = {};
        definitions[optdef.type].forEach(d => {
            if (d.hasOwnProperty('length')) {
                obj[d.name] = [];
                let n = parseInt(d.length);
                if (~isNaN(n)) {
                    for (var ii = 0; ii < n; ii++) {
                        obj[d.name].push(create_object_of_type(d, definitions));
                    }
                }
            } else {
                obj[d.name] = create_object_of_type(d, definitions);
            }
        })
        return obj;
    } else {
        return null;
    }
}

const upload_or_save_item = function(mod, container, current_type, path, obj, D) {
    if (mod == 'upl') {
        let c = container.querySelector('input.upload');
        c.dataset.path = path;
        c.click();
    } else if (mod == 'sav') {
        if (D.functions.on_save_item) {
            D.functions.on_save_item(current_type, path, obj);
        } else {
            let filename = prompt('Enter object filename:','item.object.json');
            download(filename,{data:obj, definition:current_type});
        }
    }
}

export function set_by_path(obj,path,new_sub_obj) {
    let pathspl = path.replace(/^_./,'').split('.');
    while (pathspl.length > 0) {
        let firstp = pathspl.shift();
        if (obj.hasOwnProperty(firstp)) {
            if (pathspl.length == 0) {
                obj[firstp] = new_sub_obj;
            } else {
                obj = obj[firstp]
            }
        } else {
            console.log(obj,'does not contain',firstp)
            return;
        }
    }
}

const by_path = function(container, topdef, path, mod, newval, D) {
    let current_def = topdef;
    let changed = true;
    if (D.definitions.hasOwnProperty(topdef.type)) {
        if (path == INITIALCHAR) {
            if (mod == 'upl' || mod == 'sav') {
                upload_or_save_item(mod, container, current_def.type, path, D.object, D);
            }
            return;
        }
        let defs = D.definitions[topdef.type];
        let subobj = D.object;
        let paths = path.replace(INITIALCHAR+'.','').split('.');
        for (var jj = 0; jj < paths.length; jj++) {
            let p = paths[jj];
            let last = jj+1 == paths.length;
            if (!isNaN(parseInt(p))) {
                if (subobj.hasOwnProperty(p)) {
                    if (last) {
                        if (mod == 'rmv') {
                            subobj.splice(p,1);
                            recreate_new_form_with_visible(container, topdef, path, D);
                        } else if (mod == 'pat') {
                            return current_def;
                        } else if (mod == 'upl' || mod == 'sav') {
                            changed = false;
                            upload_or_save_item(mod, container, current_def.type, path, subobj[p], D);
                        } else if (mod == 'mod') {
                            subobj[p] = newval;
                        } // mod == 'add' is taken care of before you ever get here
                        if (D.functions.on_change && changed) D.functions.on_change(path,newval,D.object);
                    } else {
                        subobj = subobj[p];
                    }
                } else {
                    console.log('fail 1 in by_path');
                }
            } else {
                let exists = subobj.hasOwnProperty(p);
                for (var ii = 0; ii < defs.length; ii++) {
                    current_def = defs[ii];
                    if (current_def.name == p) {
                        if (last || !exists) {
                            if (mod == 'rmv') {} else { // can't remove an object only an array item
                                let o = create_object_of_type(current_def, D.definitions);
                                let is_array = current_def.hasOwnProperty('length');
                                if (mod == 'mod' && last) {
                                    subobj[p] = newval;
                                } else if (mod == 'pat') {
                                    return current_def;
                                } else if (is_array) {
                                    if (!exists) subobj[p] = [];
                                    subobj[p].push(o);
                                    recreate_new_form_with_visible(container, topdef, path, D);
                                } else if (mod == 'upl' || mod == 'sav') {
                                    changed = false;
                                    upload_or_save_item(mod, container, current_def.type, path, subobj[p], D);
                                } else {
                                    subobj[p] = o;
                                    recreate_new_form_with_visible(container, topdef, path, D);
                                }
                                if (D.functions.on_change && changed) D.functions.on_change(path,newval,D.object);
                            }
                            return;
                        } else if (subobj.hasOwnProperty(p)) {
                            if (D.definitions.hasOwnProperty(current_def.type)) defs = D.definitions[current_def.type];
                            subobj = subobj[p];
                        } else {
                            console.log('fail 2 in by_path')
                        }
                        break;
                    }
                }
            }
        }
    }
}

const create_new_form = function(container, topdef, D) {
    let f = container.querySelector('div.data_form_top_div');
    while(f.firstChild){ f.removeChild(f.firstChild);}

    f.insertAdjacentHTML('beforeend','<input class="upload" type="file" accept=".json" style="display: none;"/>');
    container.querySelector('input.upload').addEventListener('change',function(ev) {
        upload_data(ev, container, topdef, ev.target.dataset.path, D);
    });

    let hide_fields = D.functions.hide_fields || [];
    create_fields(f, D.definitions, topdef, D.object, INITIALCHAR, -1, hide_fields);
    container.querySelectorAll("button.d_f_d_e").forEach(but => {
        but.addEventListener('click', (ev) => { 
            ev.stopPropagation();
            ev.preventDefault();
            let li = ev.target.closest('label.d_f_d_t');
            if (li) {
                toggle_visibility(li, true);
            }
        });
    });
    container.querySelectorAll("button.d_f_d_act").forEach(button => {
        button.addEventListener('click', (ev) => {
            let act = (ev.target.dataset.hasOwnProperty('rmv')) ? 'rmv' : 
                (ev.target.dataset.hasOwnProperty('upl')) ? 'upl' :
                (ev.target.dataset.hasOwnProperty('sav')) ? 'sav' : null;
            let nme = ev.target.dataset[act].replace('_.','');
            let cntinue = (act == 'rmv') ? confirm(`Are you sure you want to delete "${nme}"?`) : true;
            if (cntinue && act != null) by_path(container, topdef, ev.target.dataset[act], act, 0, D);
        });
    });
    container.querySelectorAll("button.d_f_d_a").forEach(button => {
        button.addEventListener('click', (ev) => {
            ev.stopPropagation();
            ev.preventDefault();
            let li = ev.target.closest('label.d_f_d_t');
            if (li) {
                toggle_visibility(li, false);
                by_path(container, topdef, li.dataset.name, 'add', 0, D);
            }
        });
    });

    // Clicking <label>s propagates to buttons below, which we don't want
    container.querySelectorAll("label").forEach(label => {
        label.addEventListener('click', (ev) => {
            ev.stopPropagation();
            ev.preventDefault();
        });
    });

    const update = (ev,inp) => {
        if (native.hasOwnProperty(inp.dataset.ntyp)) {
            let val = native[inp.dataset.ntyp].op((inp.dataset.ntyp == 'bool') ? inp.checked : inp.value);
            by_path(container, topdef, inp.dataset.pth, 'mod', val, D);
        }
    }
    container.querySelectorAll('select').forEach(inp => { inp.addEventListener('change', ev=> { update(ev,inp); }); });
    container.querySelectorAll('input').forEach(inp => { inp.addEventListener('input', ev=> { update(ev,inp) }); });
    
}

const recreate_new_form_with_visible = function(container, topdef, path, D) {
    create_new_form(container, topdef, D);
    container.querySelectorAll('div[data-name]').forEach(el => {
        if (path.startsWith(el.dataset.name)) el.classList.remove('hide');
    });
}

const upload_data = function(event, container, topdef, path, D) {
    let isbinary = false;
    event.preventDefault();
    if (!(event.target.files && event.target.files.length>0)) return;
    var file = event.target.files[0]; //TODO Modify for multiple files
    var reader = new FileReader();
    reader.onload = function(ev) {
        let data = JSON.parse((isbinary) ? new Uint8Array(reader.result) : reader.result);
        let current_def = by_path(container, topdef, path, 'pat', null, D);
        if (D.functions.on_load) data = D.functions.on_load(current_def, path, data);
        if (path == INITIALCHAR) {
            data = merge_deep(create_object_of_type(topdef, D.definitions), data);
            reload(container, topdef, data, D);
        } else {
            data = merge_deep(create_object_of_type(current_def, D.definitions), data);
            by_path(container, topdef, path, 'mod', data, D);
            recreate_new_form_with_visible(container, topdef, path, D);
        }
    }
    if (isbinary) {
      reader.readAsArrayBuffer(file); //read the file as arraybuffer
    } else {
      reader.readAsText(file);
    }
}

const reload = function(container, topdef, objct, D) {
    for (var key in objct) { D.object[key] = objct[key];}
    create_new_form(container, topdef, D);
    if (D.functions.on_change) D.functions.on_change('', null, D.object);
}

export function create(container, definitions, def, obj, functions) {
    if (!definitions.hasOwnProperty(def)) {
        console.log(`Definitions do not contain "${def}"`);
        return;
    }
    let object = obj || {};
    let topdef = {type:def};
    object = merge_deep(create_object_of_type(topdef, definitions), object);
    let D = {definitions, object, functions};
    while(container.firstChild){ container.removeChild(container.firstChild);}
    container.insertAdjacentHTML('beforeend',`<div class="data_form_top_div" style="flex:1"></div>`);
    const reload_ = function(data) {
        if (D.functions.on_load) data = D.functions.on_load(topdef,INITIALCHAR,data);
        reload(container, topdef, data, D);
    };

    create_new_form(container, topdef, D);
    return {reload:reload_}
}

export function download(filename,x) {
    if (!filename) return;
    console.log('Downloading to',filename,x)
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(JSON.stringify(x,null,2)));
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}
  