const SUPABASE_URL = "https://slewytwwohwfxsyasorw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsZXd5dHd3b2h3ZnhzeWFzb3J3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwMDQ3NDcsImV4cCI6MjEwNTU4MDc0N30.MRBpz7VtXN1cv6tWet5BCSGBkO_USJpsVlCfn648GFc";

const nationalStatus = document.getElementById("national-status");
const nationalResults = document.getElementById("national-results");
const stateSelect = document.getElementById("state-select");
const stateResults = document.getElementById("state-results");
const lgaResults = document.getElementById("lga-results");


async function fetchSupabase(view) {
    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/${view}?select=*`,
        {
            headers: {
                "apikey": SUPABASE_ANON_KEY,
                "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
            }
        }
    );

    if (!response.ok) {
        throw new Error(
            `${view}: ${response.status} ${response.statusText}`
        );
    }

    return response.json();
}


function formatNumber(value) {
    if (value === null || value === undefined) {
        return "—";
    }

    return Number(value).toLocaleString("en-GB");
}


function createCard(label, value, extraClass = "") {
    return `
        <div class="result-card ${extraClass}">
            <span class="label">${label}</span>
            <span class="value">${formatNumber(value)}</span>
        </div>
    `;
}


function renderNational(data) {
    if (!data.length) {
        nationalResults.innerHTML =
            '<div class="empty">No national results available.</div>';
        return;
    }

    const result = data[0];

    nationalResults.innerHTML = `
        ${createCard("Verified polling units", result.verified_polling_units)}
        ${createCard("Registered voters", result.registered_voters)}
        ${createCard("Accredited voters", result.accredited_voters)}
        ${createCard("Total votes cast", result.total_votes_cast)}
        ${createCard("Total valid votes", result.total_valid_votes)}
        ${createCard("Rejected votes", result.rejected_votes)}

        ${createCard("PDP", result.pdp, "party-card")}
        ${createCard("APC", result.apc, "party-card")}
        ${createCard("NDC", result.ndc, "party-card")}
        ${createCard("ADC", result.adc, "party-card")}
    `;
}


function populateStates(data) {
    stateSelect.innerHTML =
        '<option value="">Select a state</option>';

    data.forEach(state => {
        const option = document.createElement("option");

        option.value = state.state_name;
        option.textContent = state.state_name;

        stateSelect.appendChild(option);
    });
}


function renderState(data, stateName) {
    const result = data.find(
        item => item.state_name === stateName
    );

    if (!result) {
        stateResults.innerHTML = "";
        return;
    }

    stateResults.innerHTML = `
        <div class="result-card">
            <span class="label">Verified polling units</span>
            <span class="value">${formatNumber(result.verified_polling_units)}</span>
        </div>

        ${createCard("Registered voters", result.registered_voters)}
        ${createCard("Accredited voters", result.accredited_voters)}
        ${createCard("Total votes cast", result.total_votes_cast)}
        ${createCard("Total valid votes", result.total_valid_votes)}
        ${createCard("Rejected votes", result.rejected_votes)}

        ${createCard("PDP", result.pdp, "party-card")}
        ${createCard("APC", result.apc, "party-card")}
        ${createCard("NDC", result.ndc, "party-card")}
        ${createCard("ADC", result.adc, "party-card")}
    `;
}


function renderLGAs(data, stateName) {
    const rows = data.filter(
        item => item.state_name === stateName
    );

    if (!rows.length) {
        lgaResults.innerHTML =
            '<div class="empty">No LGA results available.</div>';
        return;
    }

    const tableRows = rows.map(row => `
        <tr>
            <td>${row.lga_name}</td>
            <td>${formatNumber(row.verified_polling_units)}</td>
            <td>${formatNumber(row.registered_voters)}</td>
            <td>${formatNumber(row.accredited_voters)}</td>
            <td>${formatNumber(row.total_votes_cast)}</td>
            <td>${formatNumber(row.total_valid_votes)}</td>
            <td>${formatNumber(row.rejected_votes)}</td>
            <td>${formatNumber(row.pdp)}</td>
            <td>${formatNumber(row.apc)}</td>
            <td>${formatNumber(row.ndc)}</td>
            <td>${formatNumber(row.adc)}</td>
        </tr>
    `).join("");

    lgaResults.innerHTML = `
        <table class="lga-table">
            <thead>
                <tr>
                    <th>LGA</th>
                    <th>Verified PUs</th>
                    <th>Registered</th>
                    <th>Accredited</th>
                    <th>Votes Cast</th>
                    <th>Valid</th>
                    <th>Rejected</th>
                    <th>PDP</th>
                    <th>APC</th>
                    <th>NDC</th>
                    <th>ADC</th>
                </tr>
            </thead>
            <tbody>
                ${tableRows}
            </tbody>
        </table>
    `;
}


async function initialise() {
    try {
        const [
            national,
            states,
            lgas
        ] = await Promise.all([
            fetchSupabase("public_national_results"),
            fetchSupabase("public_state_results"),
            fetchSupabase("public_lga_results")
        ]);

        renderNational(national);
        populateStates(states);

        stateSelect.addEventListener("change", () => {
            const stateName = stateSelect.value;

            if (!stateName) {
                stateResults.innerHTML = "";
                lgaResults.innerHTML = "";
                return;
            }

            renderState(states, stateName);
            renderLGAs(lgas, stateName);
        });

        nationalStatus.textContent =
            "Results loaded successfully.";

    } catch (error) {
        console.error(error);

        nationalStatus.innerHTML =
            `<div class="error">
                Unable to load results.
            </div>`;
    }
}


initialise();