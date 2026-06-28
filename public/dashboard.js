const Dashboard = {
    async init() {
        const container = document.getElementById('dash-content');
        container.innerHTML = '<p>Loading analytics...</p>';

        try {
            // Fetch Supabase data
            const { data: scheduleData } = await _supabase.from('BackEndData').select('*');
            
            // Fetch Weekly Stats from Google
            const chartResp = await fetch(`${GOOGLE_SCRIPT_URL}?action=getWeeklyStats`);
            const chartData = await chartResp.json();

            this.render(scheduleData, chartData);
        } catch (err) {
            console.error(err);
        }
    },

    render(scheduleData, chartData) {
        const stats = this.calculateStats(scheduleData);
        const container = document.getElementById('dash-content');

        container.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 25px;">
                ${this.createStatCard("Active Jobs", stats.total, "#01579b")}
                ${this.createStatCard("Total Checklists", chartData.checklists.reduce((a,b)=>a+b,0), "#2e7d32")}
                ${this.createStatCard("Total Tests", chartData.tests.reduce((a,b)=>a+b,0), "#c62828")}
            </div>

            <div style="background:white; padding:20px; border:1px solid #ddd; border-radius:8px; margin-bottom:25px;">
                <h4 style="margin-top:0;">Weekly Performance (Last 8 Weeks)</h4>
                <div style="height: 300px; position: relative;">
                    <canvas id="weeklyChart"></canvas>
                </div>
            </div>
        `;

        // Initialize the Chart
        this.initWeeklyChart(chartData);
    },

    initWeeklyChart(data) {
        const ctx = document.getElementById('weeklyChart').getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.labels,
                datasets: [
                    {
                        label: 'Checklists Completed',
                        data: data.checklists,
                        backgroundColor: 'rgba(46, 125, 50, 0.7)', // Green
                        borderColor: '#2e7d32',
                        borderWidth: 1
                    },
                    {
                        label: 'Tests Completed',
                        data: data.tests,
                        backgroundColor: 'rgba(198, 40, 40, 0.7)', // Red
                        borderColor: '#c62828',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, grid: { display: false } },
                    x: { grid: { display: false } }
                },
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });

        container.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px;">
                ${this.createStatCard("Active Jobs", stats.total, "#01579b")}
                ${this.createStatCard("Verified", stats.verified, "#2e7d32")}
                
                ${this.createStatCard("Fleet Units", external.Fleet ? external.Fleet.count : 0, "#5e35b1")}
                
                ${this.createStatCard("Inventory Alerts", external.Inventory ? external.Inventory.summary : 0, "#d32f2f")}
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                <div style="background:white; padding:20px; border:1px solid #ddd; border-radius:8px;">
                    <h4>External System Status</h4>
                    ${this.renderExternalBreakdown(external)}
                </div>
                <div style="background:white; padding:20px; border:1px solid #ddd; border-radius:8px;">
                    <h4>Recent Audit Log</h4>
                    ${this.renderHistoryList(history)}
                </div>
            </div>
        `;
    },

    renderExternalBreakdown(external) {
        return Object.entries(external).map(([name, data]) => `
            <div style="display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid #eee;">
                <span style="font-weight:bold;">${name}</span>
                <span>${data.count} entries | <small>${data.summary}</small></span>
            </div>
        `).join('');
    }
};