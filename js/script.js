// Event date configuration from config
const config = window.EVENT_CONFIG || {};
const EVENT_DATE = new Date(config.eventDate || '2025-11-15T18:00:00-08:00').getTime();

// Countdown timer
function updateCountdown() {
    const now = new Date().getTime();
    const distance = EVENT_DATE - now;

    if (distance < 0) {
        document.getElementById('countdown').innerHTML = '<div class="time-box"><span class="time-value">🎉</span><span class="time-label">It\'s Happening!</span></div>';
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

// Load address from config
function loadAddress() {
    const config = window.EVENT_CONFIG || {};
    const address = config.address || 'Address will be shared with attendees';
    document.getElementById('address').textContent = address;
}

// Load event date and time from config
function loadEventDateTime() {
    const config = window.EVENT_CONFIG || {};
    const eventDate = new Date(config.eventDate || '2025-11-15T18:00:00-08:00');

    // Format: "November 15th, 2025 @ 6:00 PM PST"
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const month = months[eventDate.getMonth()];
    const day = eventDate.getDate();
    const year = eventDate.getFullYear();

    // Add ordinal suffix (st, nd, rd, th)
    const getOrdinal = (n) => {
        const s = ['th', 'st', 'nd', 'rd'];
        const v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };

    // Format time (e.g., "6:00 PM")
    let hours = eventDate.getHours();
    const minutes = String(eventDate.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const timeString = `${hours}:${minutes} ${ampm}`;

    // Get timezone abbreviation
    const timeZone = eventDate.toLocaleTimeString('en-US', { timeZoneName: 'short' }).split(' ').pop();

    const formattedDateTime = `${month} ${getOrdinal(day)}, ${year} @ ${timeString} ${timeZone}`;

    // Update the event date display
    const eventDateElement = document.querySelector('.event-date p');
    if (eventDateElement) {
        const calendarHint = eventDateElement.querySelector('.calendar-hint');
        eventDateElement.innerHTML = `${formattedDateTime} ${calendarHint ? calendarHint.outerHTML : ''}`;
    }

    // Update "What to Expect" paragraph with dynamic time
    const whatToExpectParagraph = document.querySelector('.detail-card p');
    if (whatToExpectParagraph && whatToExpectParagraph.textContent.includes('6:00 PM')) {
        whatToExpectParagraph.textContent = `Join us for Scott Pilgrim vs. The World screening and amazing sandwiches from Claro's! Dinner and the movie start at ${timeString} ${timeZone}, but feel free to arrive early—we'll have games set up to hang out and have fun before the show. Good vibes and great company guaranteed!`;
    }
}

// Open directions in Google Maps
function openDirections() {
    const config = window.EVENT_CONFIG || {};
    const lat = config.lat;
    const lng = config.lng;

    if (lat && lng) {
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
    } else {
        const address = document.getElementById('address').textContent;
        if (address && address !== 'Address will be shared with attendees') {
            window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`, '_blank');
        } else {
            alert('Location details coming soon!');
        }
    }
}

// Add to calendar function
function addToCalendar() {
    const config = window.EVENT_CONFIG || {};
    const address = config.address || 'Address TBD';

    // Event details
    const title = 'Scott Pilgrim & Sandwich Day 2025';
    const description = 'Scott Pilgrim vs. The World screening at the End Zone Game Room with amazing sandwiches from Claro\'s Italian Market!';
    const location = address;

    // Generate start and end dates from EVENT_DATE
    const eventStart = new Date(config.eventDate || '2025-11-15T18:00:00-08:00');
    const eventEnd = new Date(eventStart.getTime() + (4 * 60 * 60 * 1000)); // 4 hours later

    // Format dates for Google Calendar (YYYYMMDDTHHMMSS)
    const formatCalendarDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${year}${month}${day}T${hours}${minutes}${seconds}`;
    };

    const startDate = formatCalendarDate(eventStart);
    const endDate = formatCalendarDate(eventEnd);

    // Create Google Calendar URL
    const googleCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${startDate}/${endDate}&details=${encodeURIComponent(description)}&location=${encodeURIComponent(location)}&ctz=America/Los_Angeles`;

    // Open in new window
    window.open(googleCalUrl, '_blank');
}

// Initialize map if coordinates are provided
function initMap() {
    const config = window.EVENT_CONFIG || {};
    const lat = config.lat;
    const lng = config.lng;

    if (lat && lng) {
        const mapContainer = document.getElementById('map');
        const iframe = document.createElement('iframe');
        iframe.width = '100%';
        iframe.height = '100%';
        iframe.style.border = '0';
        iframe.style.pointerEvents = 'none';
        iframe.loading = 'lazy';

        // Use OpenStreetMap embed (no API key needed)
        const osmUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${parseFloat(lng)-0.01},${parseFloat(lat)-0.01},${parseFloat(lng)+0.01},${parseFloat(lat)+0.01}&layer=mapnik&marker=${lat},${lng}`;
        iframe.src = osmUrl;

        mapContainer.innerHTML = '';
        mapContainer.appendChild(iframe);

        // Enable interaction on click
        mapContainer.addEventListener('click', () => {
            iframe.style.pointerEvents = 'auto';
        });

        // Disable interaction when mouse leaves
        mapContainer.addEventListener('mouseleave', () => {
            iframe.style.pointerEvents = 'none';
        });
    }
}

// Smooth scroll for internal links
document.addEventListener('DOMContentLoaded', () => {
    loadAddress();
    loadEventDateTime();
    initMap();

    // Add smooth scrolling to all links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
});

// Add parallax effect on scroll
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
                // Fade out title faster on mobile, slower on desktop
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

// Modal functions for parking map
function openMapModal() {
    // Remove existing modal if any
    let modal = document.getElementById('mapModal');
    if (modal) {
        modal.remove();
    }

    // Get actual viewport dimensions in pixels
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Create modal from scratch
    modal = document.createElement('div');
    modal.id = 'mapModal';
    modal.style.cssText = `display: flex; position: fixed; top: 0; left: 0; width: ${vw}px; height: ${vh}px; z-index: 99999; background-color: rgba(0, 0, 0, 0.95); align-items: center; justify-content: center; margin: 0; padding: 0;`;

    // Create close button
    const closeBtn = document.createElement('span');
    closeBtn.innerHTML = '&times;';
    closeBtn.className = 'modal-close';
    closeBtn.onclick = closeMapModal;
    closeBtn.style.cssText = 'position: fixed; top: 20px; right: 35px; color: #f1f1f1; font-size: 50px; font-weight: 300; cursor: pointer; z-index: 100000;';

    // Create image with pixel dimensions - use 90% to leave room but make it big
    const img = document.createElement('img');
    img.src = 'assets/images/irvine_village_parking.jpg';
    img.alt = 'Parking Map';
    img.style.cssText = `display: block; width: 90vw; height: auto; max-height: 90vh; object-fit: contain; position: relative; z-index: 100000;`;
    img.onclick = (e) => e.stopPropagation();

    // Assemble and add to document root (not body, to avoid stacking context issues)
    modal.appendChild(closeBtn);
    modal.appendChild(img);
    modal.onclick = closeMapModal;

    document.documentElement.appendChild(modal);
    document.body.style.overflow = 'hidden';
}

function closeMapModal() {
    const modal = document.getElementById('mapModal');
    if (modal) {
        modal.remove();
    }
    document.body.style.overflow = 'auto';
}

// Close modal on escape key
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeMapModal();
    }
});
