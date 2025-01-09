import "./plotly-2.26.2.min.js"

const make_problem_table = function(problem) {
  let inputs = '', outputs = '';
  if (problem.inputs) {
    for (const [key,val] of Object.entries(problem.inputs)) {
      let v = JSON.stringify(val);
      inputs += `<tr><td style="word-wrap: break-word; max-width: 150px;" title="${v}">${key}</td><td>${v}</td></tr>`;
    }
  }
  problem.points_earned = 0;
  problem.points_possible = 0;
  for (const [key,val] of Object.entries(problem.outputs)) {
    let points = `<td>${val.points_possible}</td>`;
    if (val.hasOwnProperty('points_earned')) {
      problem.points_earned += parseFloat(val.points_earned);
      problem.points_possible += parseFloat(val.points_possible);
      let cls = (val.points_earned == val.points_possible) ? 'table-success' : 'table-danger';
      points = `<td class="${cls}">${parseFloat(val.points_earned)}/${parseFloat(val.points_possible)}</td>`;
    }
    if (val.points_possible > 0) {
      outputs += `<tr>
          <td>${key}</td>
          <td style="word-wrap: break-word; max-width: 150px;" title="${val.expected}">${val.expected}</td>
          <td style="word-wrap: break-word; max-width: 150px;" title="${val.actual}">${val.actual}</td><td>${val.tolerance}</td>${points}
        </tr>`;
    }

  }
  let badge = '';
  if (problem.points_possible > 0) {
    let cls = (problem.points_possible == problem.points_earned) ? 'bg-success' :
              (problem.points_earned == 0) ? 'bg-danger' : 'bg-warning';
    badge = `<span class="badge ${cls}" style="float:right">${problem.points_earned} earned / ${problem.points_possible} possible</span>`;
  } else {
    badge = `<span class="badge bg-warning" style="float:right">No points awarded</span>`;
  }
  return `
    <table class="table border table-light border-dark">
      <thead class="table-secondary">
        <td>${problem.name}${badge}</td>
      </thead>
      <tbody>
        <tr class="p-0 m-0">
          <td class="p-0 m-0" colspan="2">
            <table class="p-0 m-0 table table-striped">
                <thead><td>Input</td><td>Value</td></thead>
                <tbody>${inputs}</tbody>
            </table>
          </td>
        </tr>
        <tr class="p-0 m-0">
          <td class="p-0 m-0" colspan="2">
            <table class="p-0 m-0 table table-striped">
              <thead><td>Output</td><td>Expected</td><td>Yours</td><td>Tolerance</td><td>Points</td></thead>
              <tbody>${outputs}</tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>`;
}

export function process_results(stdout, results, elmnt, is_offline) {
    if (!window.hasOwnProperty('DOMPurify')) window.DOMPurify = {sanitize:(v) => { return v;}};
    let points_earned =0, points_possible = 0, html = ''
    if (stdout) {
      html = `<h4 style="text-align:center">Stdout</h4>
        <pre class="alert alert-secondary">${stdout}</pre>`;
    }
    let results_html = '';
    let offline = `<a class="btn btn-dark btn-sm" onclick="vysubmit()">Submit to vy.tools for grading</a>`;
    let summary = '';
    if (results && results.problems) {
      for (var i = 0; i < results.problems.length; i++) {
        results_html += make_problem_table(results.problems[i]);
        points_earned += results.problems[i].points_earned;
        points_possible += results.problems[i].points_possible;
      }
      if (results.ran) {
        summary = `<div class="alert alert-dark" role="alert" style="text-align:center;">
        <h5>Earned <span style="font-weight:bold; font-color:red">${(points_earned/points_possible*100).toFixed(0)}%</span> of possible points</h5>
        ${(is_offline) ? offline : ''}</div>`;
      }
    }
    html += `<h4 style="text-align:center">Tests</h4>${summary}${DOMPurify.sanitize(results_html)}`;
    elmnt.insertAdjacentHTML('beforeend',html);
    if (results && results.plots) {
      elmnt.insertAdjacentHTML('beforeend','<h4 style="text-align:center">Plots</h4>');
      for (var i = 0; i < results.plots.length; i++) {
        // TODO is there any way at all to DOMPurify this?  
        let plotly_div = document.createElement('div');
        elmnt.appendChild(plotly_div);  
        Plotly.newPlot(plotly_div, results.plots[i].data || [], results.plots[i].layout || {}, results.plots[i].config || {});
      }
    }
}
