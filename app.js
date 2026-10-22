const SUPABASE_URL = "https://slewytwwohwfxsyasorw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsZXd5dHd3b2h3ZnhzeWFzb3J3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwMDQ3NDcsImV4cCI6MjEwNTU4MDc0N30.MRBpz7VtXN1cv6tWet5BCSGBkO_USJpsVlCfn648GFc";

// UI Elements
const stateSelect = document.getElementById("state-select");
const lgaSelect = document.getElementById("lga-select");
const metricsBody = document.getElementById("metrics-body");
const dynamicTitle = document.getElementById("dynamic-state-title");

// Summary Block Elements
const estCoverageText = document.getElementById("est-coverage-text");
const estCoveragePct = document.getElementById("est-coverage-pct");
const estProgressFill = document.getElementById("est-progress-fill");

let currentLgaData = []; 
let nationalTotalPUs = 176846;

// Helpers
const fmt = (num) => (num === null || num === undefined) ? "—" : Number(num).toLocaleString("en-GB");
const pct = (part, total) => (total && total > 0) ? ((part / total) * 100).toFixed(1) + "%" : "0.0%";

// Converts "OSUN" to "Osun"
const toTitleCase = (str) => {
    if (!str) return "";
    return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

async function fetchSupabase(view) {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${view}?select=*`, {
        headers: {
            "apikey": SUPABASE_ANON_KEY,
            "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
        }
    });
    if (!response.ok) throw new Error(`Error fetching ${view}`);
    return response.json();
}

// 1. Load Federal Dashboard
async function loadDashboard() {
    try {
        const [data, stateData] = await Promise.all([
            fetchSupabase("public_national_results"),
            fetchSupabase("public_state_results")
        ]);
        
        if (!data.length) return;
        const result = data[0];

        if (stateData.length > 0) {
            const sum = stateData.reduce((acc, curr) => acc + (curr.total_polling_units || 0), 0);
            if (sum > 0) nationalTotalPUs = sum;
        }

        document.getElementById("dash-coverage-text").textContent = `${fmt(result.verified_polling_units)} of ${fmt(nationalTotalPUs)}`;
        document.getElementById("dash-registered").textContent = fmt(result.registered_voters);
        document.getElementById("dash-accredited").textContent = fmt(result.accredited_voters);
        document.getElementById("dash-valid").textContent = fmt(result.total_valid_votes);
        document.getElementById("dash-rejected").textContent = fmt(result.rejected_votes);
        
        document.getElementById("dash-apc").textContent = fmt(result.apc);
        document.getElementById("dash-pdp").textContent = fmt(result.pdp);
        document.getElementById("dash-adc").textContent = fmt(result.adc);
        document.getElementById("dash-ndc").textContent = fmt(result.ndc);

        const pctValue = ((result.verified_polling_units / nationalTotalPUs) * 100).toFixed(1);
        const pctBadge = document.getElementById("dash-coverage-pct");
        if (pctBadge) {
            pctBadge.textContent = `${pctValue}%`;
            const safeLeft = Math.min(Math.max(pctValue, 0), 95); 
            pctBadge.style.left = `calc(${safeLeft}% - 16px)`;
        }

    } catch (err) {
        console.error("Dashboard error", err);
    }
}

// 2. Load States
async function loadStates() {
    try {
        const data = await fetchSupabase("public_state_results");
        stateSelect.innerHTML = '<option value="">Select a state</option>';
        
        // Sort states alphabetically
        data.sort((a, b) => a.state_name.localeCompare(b.state_name));

        data.forEach(row => {
            const opt = document.createElement("option");
            opt.value = row.state_name; // Keep raw value for Supabase query
            opt.textContent = toTitleCase(row.state_name); // Title Case for display
            stateSelect.appendChild(opt);
        });
    } catch (err) {
        stateSelect.innerHTML = '<option value="">Error loading states</option>';
    }
}

// 3. Handle State Change
stateSelect.addEventListener("change", async () => {
    const stateName = stateSelect.value;
    
    // Reset UI
    metricsBody.innerHTML = '';
    lgaSelect.innerHTML = '<option value="">Select a state first</option>';
    lgaSelect.disabled = true;
    currentLgaData = [];
    
    if (!stateName) {
        dynamicTitle.textContent = 'State Estimates';
        updateSummaryBlock(0, 0); 
        return;
    }

    dynamicTitle.textContent = `${toTitleCase(stateName)} estimates`;

    try {
        // Note: Supabase .eq is case-sensitive, but since we use the exact value from the dropdown, it works.
        const lgaData = await fetchSupabase(`public_lga_results?state_name=eq.${encodeURIComponent(stateName)}`);
        
        // Sort LGAs alphabetically
        lgaData.sort((a, b) => a.lga_name.localeCompare(b.lga_name));
        currentLgaData = lgaData;
        
        // Populate LGA Dropdown
        lgaSelect.innerHTML = '<option value="">All LGAs</option>';
        lgaData.forEach(lga => {
            const opt = document.createElement("option");
            opt.value = lga.lga_name;
            opt.textContent = toTitleCase(lga.lga_name);
            lgaSelect.appendChild(opt);
        });
        lgaSelect.disabled = false;

        renderMetrics(currentLgaData);

    } catch (err) {
        console.error("State change error", err);
        metricsBody.innerHTML = '<tr><td colspan="9" style="text-align:center;">Error loading data.</td></tr>';
    }
});

// 4. Handle LGA Change (Filter Table)
lgaSelect.addEventListener("change", () => {
    const selectedLga = lgaSelect.value;
    if (!selectedLga) {
        renderMetrics(currentLgaData);
    } else {
        const filtered = currentLgaData.filter(lga => lga.lga_name === selectedLga);
        renderMetrics(filtered);
    }
});

// 5. Render LGA Metrics Table
function renderMetrics(lgas) {
    if (!lgas || !lgas.length) {
        metricsBody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding: 32px; color: #9CA3AF;">No reviewed polling units found for this selection.</td></tr>';
        updateSummaryBlock(0, 0);
        return;
    }

    let totalVerifiedPUs = 0;
    let totalStatePUs = 0;

    metricsBody.innerHTML = lgas.map(r => {
        totalVerifiedPUs += (r.verified_polling_units || 0);
        totalStatePUs += (r.total_polling_units || 0);

        return `
            <tr>
                <td class="lga-name">${toTitleCase(r.lga_name)}</td>
                <td>${fmt(r.registered_voters)}</td>
                <td>${fmt(r.accredited_voters)}</td>
                <td>${fmt(r.total_valid_votes)}</td>
                <td>${fmt(r.rejected_votes)}</td>
                <td>${fmt(r.apc)}</td>
                <td>${fmt(r.pdp)}</td>
                <td>${fmt(r.adc)}</td>
                <td>${fmt(r.ndc)}</td>
            </tr>
        `;
    }).join("");

    updateSummaryBlock(totalVerifiedPUs, totalStatePUs);
}

// 6. Update the Summary Block
function updateSummaryBlock(verified, total) {
    if (!estCoverageText || !estCoveragePct || !estProgressFill) return;

    // If All LGAs are selected, we need the total state PUs. 
    // The view only returns PUs for LGAs that have results. 
    // We use the sum of 'total_polling_units' for the selected LGAs.
    
    estCoverageText.innerHTML = `${fmt(verified)} <span>of</span> ${fmt(total)}`;
    
    const percentage = total > 0 ? (verified / total) * 100 : 0;
    const formattedPct = percentage.toFixed(1) + "%";
    
    estCoveragePct.textContent = formattedPct;
    estProgressFill.style.width = `${Math.min(percentage, 100)}%`;
}

// Initialize
loadDashboard();
loadStates();
