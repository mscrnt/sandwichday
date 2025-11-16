// Event date configuration from config
const config = window.EVENT_CONFIG || {};
const eventDate = new Date(config.eventDate || '2025-11-15T18:00:00-08:00');
const EVENT_DATE = eventDate.getTime();

// Countdown timer
function updateCountdown() {
    const now = new Date().getTime();
    const distance = EVENT_DATE - now;

    if (distance < 0) {
        document.getElementById('countdown').innerHTML = '<div class="time-box"><span class="time-value">🎉</span><span class="time-label">Soon!</span></div>';
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

// Update page title with dynamic year
document.addEventListener('DOMContentLoaded', () => {
    const year = eventDate.getFullYear();
    const previousYear = year - 1;

    document.title = `Thank You - Sandwich Day ${year}`;

    // Update subtitle with current year
    const subtitle = document.querySelector('.subtitle');
    if (subtitle) {
        subtitle.textContent = `Scott Pilgrim & Sandwich Day ${year}`;
    }

    // Update full page link with previous year
    const fullPageLink = document.getElementById('fullPageLink');
    if (fullPageLink) {
        fullPageLink.textContent = `View ${previousYear} Page`;
    }
});
