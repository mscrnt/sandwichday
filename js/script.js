// Event date configuration from config
const config = window.EVENT_CONFIG || {};

// Check if viewing full page with historic date
const urlParams = new URLSearchParams(window.location.search);
const viewFull = urlParams.get('view') === 'full';
const useHistoricDate = viewFull && config.historicDate;

// Use historic date if viewing full page and historic date is set, otherwise use event date
const dateToUse = useHistoricDate ? config.historicDate : config.eventDate;
const EVENT_DATE = new Date(dateToUse || '2026-11-21T16:00:00-08:00').getTime();

// Private event details, fetched from /api/event-details (password-protected by functions/_middleware.js)
const DEFAULT_LOCATION = 'Mission Viejo, CA';
const gatedDetails = {
    address: null,
    lat: null,
    lng: null,
    venueName: null,
    venueDetails: null
};

// Countdown timer
function updateCountdown() {
    const now = new Date().getTime();
    const distance = EVENT_DATE - now;

    if (distance < 0) {
        const countdownElement = document.getElementById('countdown');
        const message = useHistoricDate ? 'It Happened!' : 'It\'s Happening!';
        countdownElement.innerHTML = `<div class="time-box"><span class="time-value">🎉</span><span class="time-label">${message}</span></div>`;
        countdownElement.style.display = 'flex';
        countdownElement.style.justifyContent = 'center';
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

updateCountdown();
setInterval(updateCountdown, 1000);

function loadEventDateTime() {
    const eventDate = new Date(dateToUse || '2026-11-21T16:00:00-08:00');

    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const month = months[eventDate.getMonth()];
    const day = eventDate.getDate();
    const year = eventDate.getFullYear();

    const getOrdinal = (n) => {
        const s = ['th', 'st', 'nd', 'rd'];
        const v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };

    const formatTime = (d) => {
        const h = d.getHours();
        return `${h % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
    };
    const timeString = formatTime(eventDate);
    const endDate = (!useHistoricDate && config.eventEnd) ? new Date(config.eventEnd) : null;
    const movieDate = (!useHistoricDate && config.movieStart) ? new Date(config.movieStart) : null;

    const timeZone = eventDate.toLocaleTimeString('en-US', { timeZoneName: 'short' }).split(' ').pop();
    const timeRange = endDate ? `${timeString} – ${formatTime(endDate)}` : timeString;
    const formattedDateTime = `${month} ${getOrdinal(day)}, ${year} @ ${timeRange} ${timeZone}`;

    const eventDateElement = document.querySelector('.event-date p');
    if (eventDateElement) {
        if (useHistoricDate) {
            eventDateElement.innerHTML = `${formattedDateTime}<br><span class="event-over-text">Event Over</span>`;
        } else {
            const calendarHint = eventDateElement.querySelector('.calendar-hint');
            eventDateElement.innerHTML = `${formattedDateTime} ${calendarHint ? calendarHint.outerHTML : ''}`;
        }
    }

    const eventDateButton = document.querySelector('.event-date');
    if (eventDateButton && useHistoricDate) {
        eventDateButton.style.cursor = 'default';
        eventDateButton.style.pointerEvents = 'none';
        eventDateButton.removeAttribute('onclick');
    }

    const fillTimes = (selector, d) => {
        if (d) document.querySelectorAll(selector).forEach(el => { el.textContent = formatTime(d); });
    };
    fillTimes('.event-start-time', eventDate);
    fillTimes('.event-end-time', endDate);
    fillTimes('.movie-start-time', movieDate);

    document.title = `Scott Pilgrim & Sandwich Day ${year}`;
}

function applyGatedDetailsToDOM() {
    const addressEl = document.getElementById('address');
    if (addressEl) addressEl.textContent = gatedDetails.address || 'Address TBD';

    const noteEl = document.getElementById('location-note');
    if (noteEl) noteEl.hidden = !!gatedDetails.address;

    if (gatedDetails.venueName) {
        const venueEl = document.querySelector('.venue-name strong');
        if (venueEl) venueEl.textContent = gatedDetails.venueName;
    }
    if (gatedDetails.venueDetails) {
        const venueDetailsEl = document.querySelector('.venue-details');
        if (venueDetailsEl) venueDetailsEl.textContent = gatedDetails.venueDetails;
    }

    const directionsBtn = document.querySelector('.btn-primary[onclick="openDirections()"]');
    if (directionsBtn) directionsBtn.disabled = !gatedDetails.address && !(gatedDetails.lat && gatedDetails.lng);

    initMap();
}

async function loadEventDetails() {
    try {
        const res = await fetch('/api/event-details', { cache: 'no-store' });
        if (res.status === 401) {
            window.location.href = '/login';
            return;
        }
        if (!res.ok) return;
        const data = await res.json();
        gatedDetails.address = data.address || null;
        gatedDetails.lat = (typeof data.lat === 'number') ? data.lat : null;
        gatedDetails.lng = (typeof data.lng === 'number') ? data.lng : null;
        gatedDetails.venueName = data.venueName || null;
        gatedDetails.venueDetails = data.venueDetails || null;
        applyGatedDetailsToDOM();
    } catch {
        // No API (e.g. plain static preview) - keep the TBD placeholders
    }
}

function openDirections() {
    const { lat, lng, address } = gatedDetails;
    if (lat && lng) {
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
    } else if (address) {
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`, '_blank');
    }
}

function addToCalendar() {
    const location = gatedDetails.address || DEFAULT_LOCATION;
    const title = `Scott Pilgrim & Sandwich Day ${new Date(config.eventDate || EVENT_DATE).getFullYear()}`;
    const description = 'Scott Pilgrim vs. The World screening and a build-your-own sandwich bar!';
    const eventStart = new Date(config.eventDate || '2026-11-21T16:00:00-08:00');
    const eventEnd = config.eventEnd ? new Date(config.eventEnd) : new Date(eventStart.getTime() + (4 * 60 * 60 * 1000));

    // UTC with trailing Z so the time is correct regardless of the visitor's timezone
    const fmt = (d) => d.toISOString().replace(/[-:]|\.\d{3}/g, '');

    const googleCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${fmt(eventStart)}/${fmt(eventEnd)}&details=${encodeURIComponent(description)}&location=${encodeURIComponent(location)}&ctz=America/Los_Angeles`;
    window.open(googleCalUrl, '_blank');
}

function initMap() {
    const { lat, lng } = gatedDetails;
    // Exact pin when coordinates are set, otherwise let Google place the address
    const query = (lat && lng) ? `${lat},${lng}` : gatedDetails.address;
    if (!query) return;

    const mapContainer = document.getElementById('map');
    if (!mapContainer || mapContainer.querySelector('iframe')) return;

    const iframe = document.createElement('iframe');
    iframe.width = '100%';
    iframe.height = '100%';
    iframe.style.border = '0';
    iframe.style.pointerEvents = 'none';
    iframe.loading = 'lazy';

    iframe.src = `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=15&output=embed`;

    mapContainer.innerHTML = '';
    mapContainer.appendChild(iframe);

    mapContainer.addEventListener('click', () => { iframe.style.pointerEvents = 'auto'; });
    mapContainer.addEventListener('mouseleave', () => { iframe.style.pointerEvents = 'none'; });
}

// ---- RSVP ----
const RSVP_ERRORS = {
    missing_name: 'Please enter your name.',
    invalid_attending: 'Pick whether you\'re coming.',
    invalid_guests: 'Pick how many people are coming.',
    rsvp_unavailable: 'RSVPs aren\'t working right now. Let the host know!'
};

function renderRsvpSummary(summary) {
    const headcount = document.getElementById('rsvp-headcount');
    if (headcount && summary) {
        const parts = [];
        if (summary.coming) parts.push(`🎸 ${summary.coming} ${summary.coming === 1 ? 'person' : 'people'} coming`);
        if (summary.maybe) parts.push(`${summary.maybe} maybe`);
        headcount.textContent = parts.length ? parts.join(' · ') : 'Be the first to RSVP!';
    }

    const sidesBox = document.getElementById('rsvp-sides');
    const list = document.getElementById('rsvp-sides-list');
    if (!sidesBox || !list) return;
    list.replaceChildren(...(summary?.sides || []).map(side => {
        const li = document.createElement('li');
        const who = document.createElement('strong');
        who.textContent = side.name;
        li.append(who, `: ${side.bringing}`);
        return li;
    }));
    sidesBox.hidden = !list.children.length;
}

function renderMyRsvp(mine) {
    const form = document.getElementById('rsvp-form');
    const done = document.getElementById('rsvp-done');
    if (!form || !done) return;

    if (mine) {
        form.elements.name.value = mine.name;
        const choice = form.querySelector(`input[name="attending"][value="${mine.attending}"]`);
        if (choice) choice.checked = true;
        if (mine.guests > 0) form.elements.guests.value = String(mine.guests);
        form.elements.bringing.value = mine.bringing || '';
        form.elements.dietary.value = mine.dietary || '';
        updateGuestsVisibility();

        const firstName = mine.name.split(' ')[0];
        document.getElementById('rsvp-done-title').textContent = {
            yes: `You're in, ${firstName}! 🎉`,
            maybe: `Hope you can make it, ${firstName}!`,
            no: `We'll miss you, ${firstName}!`
        }[mine.attending];
        const details = [];
        if (mine.attending !== 'no') details.push(mine.guests === 1 ? 'Just you' : `Party of ${mine.guests}`);
        if (mine.bringing) details.push(`bringing ${mine.bringing}`);
        document.getElementById('rsvp-done-detail').textContent = details.join(', ');
    }
    done.hidden = !mine;
    form.hidden = !!mine;
}

function updateGuestsVisibility() {
    const form = document.getElementById('rsvp-form');
    const field = document.getElementById('rsvp-guests-field');
    if (form && field) field.hidden = form.querySelector('input[name="attending"]:checked')?.value === 'no';
}

async function loadRsvp() {
    try {
        const res = await fetch('/api/rsvp', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        renderMyRsvp(data.mine);
        renderRsvpSummary(data.summary);
    } catch {
        // Static preview without the API: leave the form as is
    }
}

async function submitRsvp(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const status = document.getElementById('rsvp-status');
    const button = form.querySelector('.rsvp-submit');
    status.textContent = '';

    button.disabled = true;
    button.textContent = 'Sending…';
    try {
        const res = await fetch('/api/rsvp', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                name: form.elements.name.value,
                attending: form.querySelector('input[name="attending"]:checked')?.value,
                guests: form.elements.guests.value,
                bringing: form.elements.bringing.value,
                dietary: form.elements.dietary.value
            })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            status.textContent = RSVP_ERRORS[data.error] || `Something went wrong (${res.status}). Try again?`;
            return;
        }
        renderMyRsvp(data.mine);
        renderRsvpSummary(data.summary);
        document.getElementById('rsvp').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch {
        status.textContent = 'Network error. Check your connection and try again.';
    } finally {
        button.disabled = false;
        button.textContent = 'Send RSVP';
    }
}

function initRsvp() {
    const form = document.getElementById('rsvp-form');
    if (!form) return;
    form.addEventListener('submit', submitRsvp);
    form.querySelectorAll('input[name="attending"]').forEach(r => r.addEventListener('change', updateGuestsVisibility));
    document.getElementById('rsvp-edit')?.addEventListener('click', () => {
        document.getElementById('rsvp-done').hidden = true;
        form.hidden = false;
        form.elements.name.focus();
    });
    loadRsvp();
}

function checkThankYouRedirect() {
    const urlParams = new URLSearchParams(window.location.search);
    const viewFull = urlParams.get('view') === 'full';
    if (config.showThankYouPage === true && !viewFull) {
        window.location.href = 'thank-you.html';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    checkThankYouRedirect();
    loadEventDateTime();
    applyGatedDetailsToDOM();
    loadEventDetails();
    initRsvp();

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) target.scrollIntoView({ behavior: 'smooth' });
        });
    });
});

let ticking = false;
function handleScroll() {
    if (!ticking) {
        window.requestAnimationFrame(() => {
            const scrolled = window.pageYOffset;
            const hero = document.querySelector('.hero');
            const title = document.querySelector('.title');
            if (hero) {
                hero.style.transform = `translateY(${scrolled * 0.5}px)`;
                hero.style.opacity = 1 - (scrolled / 500);
            }
            if (title) {
                const isMobile = window.innerWidth <= 768;
                const fadeDistance = isMobile ? 150 : 300;
                title.style.opacity = Math.max(0, 1 - (scrolled / fadeDistance));
            }
            ticking = false;
        });
        ticking = true;
    }
}
window.addEventListener('scroll', handleScroll);
