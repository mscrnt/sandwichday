// Event date configuration from config
const config = window.EVENT_CONFIG || {};
const eventDate = new Date(config.eventDate || '2026-11-21T16:00:00-08:00');
const EVENT_DATE = eventDate.getTime();

// Countdown timer
function updateCountdown() {
    const now = new Date().getTime();
    const distance = EVENT_DATE - now;

    if (distance < 0) {
        document.getElementById('countdown').innerHTML = '<div class="time-box"><span class="time-value">🎉</span><span class="time-label">See you next year!</span></div>';
        return;
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    document.getElementById('days').textContent = String(days).padStart(2, '0');
    document.getElementById('hours').textContent = String(hours).padStart(2, '0');
    document.getElementById('minutes').textContent = String(minutes).padStart(2, '0');
    document.getElementById('seconds').textContent = String(seconds).padStart(2, '0');
}

// Update countdown every second
updateCountdown();
setInterval(updateCountdown, 1000);

// Thank the hosts by name; names come from the EVENT_HOSTS secret, so they never sit in this public repo
async function loadHostThanks() {
    const el = document.getElementById('host-thanks');
    if (!el) return;
    try {
        const res = await fetch('/api/event-details', { cache: 'no-store' });
        if (!res.ok) return;
        const { hosts } = await res.json();
        if (!hosts) return;
        el.textContent = `A huge thank you to ${hosts} for hosting us! 🏠💛`;
        el.hidden = false;
    } catch {
        // No names, no line: the rest of the page still works
    }
}

document.addEventListener('DOMContentLoaded', loadHostThanks);

// Title, subtitle and link name the party that just happened (HISTORIC_DATE);
// the countdown above runs to the next one (EVENT_DATE)
document.addEventListener('DOMContentLoaded', () => {
    const year = config.historicDate
        ? new Date(config.historicDate).getFullYear()
        : eventDate.getFullYear() - 1;

    document.title = `Thank You - Sandwich Day ${year}`;

    const subtitle = document.querySelector('.subtitle');
    if (subtitle) {
        subtitle.textContent = `Scott Pilgrim & Sandwich Day ${year}`;
    }

    // The full page link opens that party's page (index.html?view=full uses HISTORIC_DATE)
    const fullPageLink = document.getElementById('fullPageLink');
    if (fullPageLink) {
        fullPageLink.textContent = `View ${year} Page`;
    }
});
