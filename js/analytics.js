// LogRocket session replay, shared by every page (login included).
// Private event data stays out of recordings:
//   - request/response bodies of the private APIs are dropped from network logs
//   - every typed input is masked (password, RSVP names, allergies)
//   - elements marked data-private (address, venue, RSVP names/sides) are redacted
(function () {
    if (!window.LogRocket) return;
    var PRIVATE_API = /\/api\/(event-details|rsvp|login)\b/;

    window.LogRocket.init('8mpvuw/sandwichday', {
        dom: { inputSanitizer: true },
        network: {
            requestSanitizer: function (request) {
                if (PRIVATE_API.test(request.url)) request.body = null;
                if (request.headers) delete request.headers.cookie;
                return request;
            },
            responseSanitizer: function (response) {
                if (PRIVATE_API.test(response.url || '')) response.body = null;
                return response;
            }
        }
    });
})();
