// dashboard.js

export class CriticalArcDashboard {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) throw new Error(`Container #${containerId} not found.`);
    
    this.STATE = { project: null, data: null, filters: { discipline: [], contractor: [], status: [], phase: [] }, eqPhase: new Map() };
    this.EQ_FILTER = { bldg: 'All', floor: 'All' };
    this.EQ_SEARCH = { q: '', incompleteOnly: true };
    this.ISS_THRESH = 30;
    this.COMPLETE_STATUSES = ['Finished'];
    
    // Theme Constants
    this.FONT = 'Barlow, sans-serif';
    this.COND = 'Barlow Condensed, sans-serif';
    this.C = { text:'#F0F0F0', muted:'#8A8F98', border:'#3E4248', panel:'#2D3035', green:'#39B54A', red:'#E04040', yellow:'#F4B942', blue:'#4A90D9' };
    this.CFG = { displayModeBar: false, responsive: true };
  }

  async mount() {
    this.injectCSS();
    this.injectHTML();
    this.bindEvents();
    await this.loadProjectsList();
  }

  // ─── 1. CORE STRUCTURE & STYLES ─────────────────────────────────────────────
  
  injectCSS() {
    // Check if styles are already injected
    if (document.getElementById('ca-dashboard-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'ca-dashboard-styles';
    style.innerHTML = `
      .ca-app { display: flex; min-height: 100vh; width: 100%; color: #F0F0F0; font-family: 'Barlow', sans-serif; }
      .ca-sidebar { width: clamp(220px, 20vw, 300px); flex: 0 0 clamp(220px, 20vw, 300px); background: #2D3035; border-right: 1px solid #3E4248; padding: 20px; position: sticky; top: 0; height: 100vh; overflow-y: auto; }
      .ca-main { flex: 1; padding: clamp(16px, 2vw, 28px) clamp(16px, 2.5vw, 36px); min-width: 0; background: #23262B; }
      
      .ca-brand { font-family: 'Barlow Condensed', sans-serif; font-size: 20px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; border-bottom: 2px solid #39B54A; padding-bottom: 12px; margin-bottom: 20px; }
      .ca-brand-sub { font-size: 11px; color: #8A8F98; letter-spacing: 1px; margin-top: 2px; }
      .ca-side-label { font-size: 11px; letter-spacing: 1px; color: #8A8F98; text-transform: uppercase; margin: 16px 0 6px; }
      
      .ca-app select, .ca-app input[type="text"] { width: 100%; background: #23262B; color: #F0F0F0; border: 1px solid #3E4248; border-radius: 6px; padding: 8px 10px; font-family: 'Barlow', sans-serif; font-size: 13px; }
      .ca-app select:focus, .ca-app input[type="text"]:focus { outline: none; border-color: #8A8F98; }
      
      .ca-checkgroup { display: flex; flex-direction: column; gap: 5px; max-height: 190px; overflow-y: auto; background: #23262B; border: 1px solid #3E4248; border-radius: 6px; padding: 8px 10px; }
      .ca-checkgroup label { display: flex; align-items: center; gap: 8px; font-size: 13px; cursor: pointer; }
      .ca-checkgroup input[type="checkbox"] { accent-color: #39B54A; width: 15px; height: 15px; flex: 0 0 auto; }
      
      .ca-hr { border: none; border-top: 1px solid #3E4248; margin: 16px 0; }
      .ca-btn-refresh { margin-top: 12px; width: 100%; font-family: 'Barlow Condensed', sans-serif; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; background: transparent; color: #F0F0F0; border: 1px solid #3E4248; border-radius: 6px; padding: 9px; cursor: pointer; transition: background .15s, border-color .15s; }
      .ca-btn-refresh:hover { background: #34383E; border-color: #8A8F98; }
      
      .ca-page-title { font-family: 'Barlow Condensed', sans-serif; font-size: clamp(28px, 4vw, 42px); font-weight: 700; text-transform: uppercase; line-height: 1.1; }
      .ca-page-sub { font-size: 14px; color: #8A8F98; margin-top: 4px; }
      .ca-page-meta { font-size: 12px; color: #5A5F68; margin-top: 6px; }
      
      .ca-tabs { display: flex; gap: 4px; background: #2D3035; padding: 4px; border-radius: 10px; border: 1px solid #3E4248; margin: 16px 0 20px; width: fit-content; }
      .ca-tab { background: transparent; border: none; border-radius: 6px; color: #8A8F98; font-family: 'Barlow Condensed', sans-serif; font-weight: 600; font-size: 13px; padding: 8px 16px; cursor: pointer; }
      .ca-tab.active { background: #34383E; color: #39B54A; }
      .ca-tabpage { display: none; }
      .ca-tabpage.active { display: block; }
      
      .ca-section-header { font-family: 'Barlow Condensed', sans-serif; font-size: 12px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #39B54A; margin: 24px 0 12px; padding-bottom: 8px; border-bottom: 1px solid #3E4248; }
      
      .ca-kpi-row { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); }
      .ca-kpi-card { background: #2D3035; border: 1px solid #3E4248; border-radius: 10px; padding: 20px 24px; text-align: center; }
      .ca-kpi-label { font-family: 'Barlow Condensed', sans-serif; font-size: 11px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; color: #8A8F98; margin-bottom: 8px; }
      .ca-kpi-value { font-family: 'DM Mono', monospace; font-size: 32px; font-weight: 500; line-height: 1; margin-bottom: 4px; }
      
      .ca-grid2 { display: grid; grid-template-columns: minmax(0,1fr) minmax(0,1fr); gap: 16px; }
      .ca-chart { width: 100%; min-width: 0; }
      
      .ca-table-wrap { max-height: 460px; overflow: auto; border: 1px solid #3E4248; border-radius: 8px; background: #2D3035; }
      .ca-dt { width: 100%; border-collapse: collapse; font-size: 12.5px; }
      .ca-dt th { text-align: left; color: #8A8F98; font-family: 'Barlow Condensed', sans-serif; font-weight: 600; text-transform: uppercase; font-size: 11px; border-bottom: 1px solid #3E4248; padding: 8px 10px; position: sticky; top: 0; background: #2D3035; }
      .ca-dt td { padding: 7px 10px; border-bottom: 1px solid #2A2D32; color: #D8DCE1; }
      .ca-dt tr:hover td { background: #282B30; }
      
      @media (max-width: 860px) {
        .ca-app { flex-direction: column; }
        .ca-sidebar { width: 100%; height: auto; position: static; border-right: none; border-bottom: 1px solid #3E4248; }
        .ca-grid2 { grid-template-columns: minmax(0,1fr); }
      }
    `;
    document.head.appendChild(style);
  }

  injectHTML() {
    this.container.innerHTML = `
      <div class="ca-app">
        <aside class="ca-sidebar">
          <div class="ca-brand">CriticalArc<div class="ca-brand-sub">Project Dashboard Platform</div></div>
          <div class="ca-side-label">Select Project</div>
          <select id="ca-projectSelect"></select>
          <hr class="ca-hr" />
          <div style="font-weight:600; font-size:14px;">Filters</div>
          
          <div class="ca-side-label">Division / Discipline</div>
          <div class="ca-checkgroup" id="ca-fDiscipline"></div>
          
          <div class="ca-side-label">Contractor / Assigned To</div>
          <div class="ca-checkgroup" id="ca-fContractor"></div>
          
          <div class="ca-side-label">Status</div>
          <div class="ca-checkgroup" id="ca-fStatus"></div>
          
          <div class="ca-side-label">Building Phase</div>
          <div class="ca-checkgroup" id="ca-fPhase"></div>
          
          <button class="ca-btn-refresh" id="ca-refreshBtn">🔄 Refresh Data</button>
        </aside>

        <main class="ca-main">
          <div id="ca-loading" style="padding: 40px; color: #8A8F98;">Loading data…</div>
          
          <div id="ca-dash" style="display:none;">
            <div class="ca-page-title" id="ca-pageTitle"></div>
            <div class="ca-page-sub">Commissioning Progress Dashboard</div>
            <div class="ca-page-meta" id="ca-pageMeta"></div>
            <hr class="ca-hr" />

            <div class="ca-tabs">
              <button class="ca-tab active" data-tab="issues">📋 Issue Tracking</button>
              <button class="ca-tab" data-tab="checklists">✅ Checklists</button>
              <button class="ca-tab" data-tab="tests">🧪 Functional Tests</button>
              <button class="ca-tab" data-tab="equipment">🔧 Equipment</button>
            </div>

            <div class="ca-tabpage active" id="ca-tab-issues"></div>
            <div class="ca-tabpage" id="ca-tab-checklists"></div>
            <div class="ca-tabpage" id="ca-tab-tests"></div>
            <div class="ca-tabpage" id="ca-tab-equipment"></div>
          </div>
        </main>
      </div>
    `;
  }

  // ─── 2. EVENTS & DATA LOADING ───────────────────────────────────────────────

  bindEvents() {
    // Native Tab Switching + Plotly Redraw
    const tabs = this.container.querySelectorAll('.ca-tab');
    tabs.forEach(btn => {
      btn.onclick = () => {
        tabs.forEach(b => b.classList.remove('active'));
        this.container.querySelectorAll('.ca-tabpage').forEach(p => p.classList.remove('active'));
        
        btn.classList.add('active');
        const targetPage = this.container.querySelector('#ca-tab-' + btn.dataset.tab);
        targetPage.classList.add('active');
        
        // IMPORTANT: Tell Plotly to resize all charts in the newly visible tab
        const charts = targetPage.querySelectorAll('.js-plotly-plot');
        charts.forEach(chart => Plotly.Plots.resize(chart));
      };
    });

    // Native Window Resize Listener
    window.addEventListener('resize', () => {
      const activeTab = this.container.querySelector('.ca-tabpage.active');
      if (activeTab) {
        const charts = activeTab.querySelectorAll('.js-plotly-plot');
        charts.forEach(chart => Plotly.Plots.resize(chart));
      }
    });

    // Filters & Refresh
    ['ca-fDiscipline', 'ca-fContractor', 'ca-fStatus', 'ca-fPhase'].forEach(id => {
      this.container.querySelector(`#${id}`).addEventListener('change', () => {
        this.STATE.filters = {
          discipline: this.readCheckGroup('ca-fDiscipline'),
          contractor: this.readCheckGroup('ca-fContractor'),
          status: this.readCheckGroup('ca-fStatus'),
          phase: this.readCheckGroup('ca-fPhase'),
        };
        this.renderAll();
      });
    });

    this.container.querySelector('#ca-refreshBtn').onclick = async () => {
      await this.loadProject(this.STATE.project);
    };
  }

  async loadProjectsList() {
    // Replace with your actual Supabase fetch or JSON endpoint
    const response = await fetch('shared-dashboard/html-dashboard/data/projects.json');
    const projects = await response.json();
    
    const sel = this.container.querySelector('#ca-projectSelect');
    sel.innerHTML = projects.map(p => `<option value="${p.project_id}">${p.name}</option>`).join('');
    sel.onchange = () => { 
      this.STATE.project = sel.value; 
      this.loadProject(sel.value); 
    };
    
    this.STATE.project = projects[0].project_id;
    await this.loadProject(this.STATE.project);
  }

  async loadProject(pid) {
    this.container.querySelector('#ca-loading').style.display = 'block';
    this.container.querySelector('#ca-dash').style.display = 'none';
    
    const resp = await fetch(`shared-dashboard/html-dashboard/data/project_${pid}.json`);
    this.STATE.data = await resp.json();
    
    this.STATE.eqPhase = new Map(this.STATE.data.equipment.map(e => [String(e.equipment_id), e.building_phase]));
    this.rebuildFilterOptions();
    this.renderAll();
    
    this.container.querySelector('#ca-loading').style.display = 'none';
    this.container.querySelector('#ca-dash').style.display = 'block';
    
    // Trigger initial resize for the active tab
    setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
  }

  // ─── 3. PLOTLY CHART CONFIG & UTILS ──────────────────────────────────────────

  baseLayout(extra = {}) {
    const out = Object.assign({
      plot_bgcolor: 'rgba(0,0,0,0)', paper_bgcolor: 'rgba(0,0,0,0)',
      font: { family: this.FONT, size: 11, color: this.C.muted },
      margin: { t: 30, b: 30, l: 10, r: 10 },
      legend: { bgcolor: 'rgba(0,0,0,0)', font: { color: this.C.muted, size: 11 } },
    }, extra);
    out.xaxis = Object.assign({ gridcolor: this.C.border, tickfont: { color: this.C.muted }, automargin: true }, extra.xaxis || {});
    out.yaxis = Object.assign({ gridcolor: this.C.border, tickfont: { color: this.C.muted }, automargin: true }, extra.yaxis || {});
    return out;
  }

  plot(id, traces, layout) {
    const el = this.container.querySelector(`#${id}`);
    if(el) Plotly.react(el, traces, this.baseLayout(layout), this.CFG);
  }

  buildCheckGroup(id, values) {
    const target = this.container.querySelector(`#${id}`);
    if (!target) return;
    target.innerHTML = values.map(v => `<label><input type="checkbox" value="${v}" /><span>${v}</span></label>`).join('');
  }

  readCheckGroup(id) {
    return [...this.container.querySelectorAll(`#${id} input[type="checkbox"]:checked`)].map(i => i.value);
  }

  rebuildFilterOptions() {
    const d = this.STATE.data;
    const uniq = (arr) => [...new Set(arr)].filter(x => x && x.trim() !== '' && x !== 'null');
    
    this.buildCheckGroup('ca-fDiscipline', uniq(d.equipment.map(e => e.discipline)).sort());
    this.buildCheckGroup('ca-fContractor', uniq(d.companies.map(c => c.name)).sort());
    this.buildCheckGroup('ca-fStatus', ['Open','In Progress','Pending Review','Closed']);
    this.buildCheckGroup('ca-fPhase', [...uniq(d.equipment.map(e => e.building_phase)).sort(), 'Unknown']);
  }

  // ─── 4. RENDERING ROUTINES ──────────────────────────────────────────────────

  renderAll() {
    // Filtering logic
    const applyFilters = (rows) => {
      const f = this.STATE.filters;
      return rows.filter(r => {
        const phase = r.building_phase || this.STATE.eqPhase.get(String(r.asset_key)) || 'Unknown';
        if (f.discipline.length && !f.discipline.includes(r.discipline)) return false;
        if (f.contractor.length && !f.contractor.includes(r.assigned_company)) return false;
        if (f.status.length && !f.status.includes(r.status)) return false;
        if (f.phase.length && !f.phase.includes(phase)) return false;
        return true;
      });
    };

    const d = this.STATE.data;
    this.renderIssues(applyFilters(d.issues));
    this.renderChecklists(applyFilters(d.checklists));
    // ... Render Tests & Equipment similarly (Calling the respective methods)

    this.container.querySelector('#ca-pageTitle').textContent = d.project_name || 'Project Dashboard';
  }

  renderIssues(issues) {
    const root = this.container.querySelector('#ca-tab-issues');
    if (!issues.length) { root.innerHTML = `<div style="padding: 20px; color: ${this.C.muted}">No issue data available.</div>`; return; }
    
    // Inject structural HTML for this tab
    root.innerHTML = `
      <div class="ca-section-header">Issue Breakdown</div>
      <div class="ca-grid2">
        <div class="ca-chart" id="ca-iss-priority" style="height: 400px;"></div>
        <div class="ca-chart" id="ca-iss-status" style="height: 380px;"></div>
      </div>
    `;

    // Now render the Native Plotly Charts
    // Because it is NOT in an iframe, the vertical legend will not clip!
    const priMap = new Map();
    issues.forEach(i => { priMap.set(i.priority, (priMap.get(i.priority)||0) + 1); });
    
    const labels = Array.from(priMap.keys());
    const values = Array.from(priMap.values());

    this.plot('ca-iss-priority', [{
      type: 'pie', hole: 0.65, labels: labels, values: values,
      marker: { line: { color: this.C.panel, width: 2 } }
    }], {
      title: { text: 'All Issues by Priority' },
      showlegend: true,
      legend: { orientation: 'v', y: -0.1, yanchor: 'top', x: 0, xanchor: 'left' },
      margin: { t: 40, b: 120, l: 10, r: 10 }
    });
    
    // ... Apply the exact same structural approach for your other charts
  }

  renderChecklists(cl) {
      // Your checklist rendering logic port here
  }
}