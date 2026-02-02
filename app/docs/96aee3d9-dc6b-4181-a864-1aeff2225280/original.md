# BritBox Web and Mobile Apps - Non-Functional Requirements (NFR)

**Last updated 23/5/25**

---

| Area | Ref # | Overview | Detail | MOSCOW | JIRA |
|------|-------|----------|--------|--------|------|
| Launch Checks & Token Exchanges | 1.1 | Launch App | a. At launch, app will exchange secure token with partners | M |  |
| Launch Checks & Token Exchanges |  |  | b. At launch, app will check for customer's existing subscription status | M |  |
| Sign-In | 2.1 | Sign Into Account Using Email/Password* | a. Authentication is done via Evergent | M |  |
| Sign-In | 2.2 | Pass through device information | a. App to pass through accurate device information to Evergent on user sign in | M |  |
| Sign-In | 2.3 | Sign In - Persistence from Same app | a. After logging into the application for the first time, the user will not have to provide the credentials again, unless the user explicitly logs out | M |  |
| Sign-In | 2.4 | Sign In - Persistence from old App | a. Keeping users signed-in from existing in market apps | M |  |
| Register | 3.1 | Registration | a. On registration, user information is sent to Evergent | M |  |
| Subscribe | 4.1 | Subscribe | a. On successful subscription from within the App, the corresponding information is passed on to Evergent | M |  |
| Concurrent Device | 5.1 | Concurrent Login | a. User will have concurrent device limits as defined by business | M |  |
| Error | 6.1 | Evergent Error | a. If Evergent system is down - enable 'circuit breaker', and allow access to alI users | S |  |
| Base App Functionality | 7.1 | App Force Update | a. Being able to target minimum app versions to support and targeting messaging to users on older app versions to upgrade to the latest version with a direct link to the relevant store | M |  |
| Base App Functionality | 7.2 | Minimum Supported OS Version | b. Being able to target minimum OS versions to support and offer targeting messaging to users on older OS versions about dropping support for their OS version and offering direct links to the device OS update settings | S |  |
| Base App Functionality | 7.3 | App Load and Performance | KPIs need to be defined | M |  |
| Parental Controls | 8.1 | Set PC | a. Parental Control setting are passed through to Evergent | M |  |
| Parental Controls | 8.2 | Disable PC | b. Disabling of parental control will be passed through to Evergent | M |  |
| Think Analytics | 9.1 | Personalisation Scalability | a. This needs to be scalable for adding more use cases and learn actions in the future. Personal Recommendations for All Rail Types - Need to assess current TA integration | M |  |
| CDN Failover | 10.1 | CDN Failover | a. Use the DPW (dynamic weighting) Media Selector response to decide which CDN to use and a failover if necessary | M |  |
| Guiding Principles | 11.1 |  | a. Not a backlog item, more for process and a playbook to follow - eg all text should be configurable - no hard coding | M |  |
| Enhanced Search | 13.1 | inc Think Analytics | a. Migration project to also include redesign per work being completed by UX team | M |  |
| Language Dictionary/Localisation | 14.1 |  | Good working practice to have despite no immediate need | S |  |
| Templating Architecture across Apps | 15.1 |  | This is a request from Francesco. Apps must use a concept of templating for rails (to provide a consistent look & feel). A certain number of templates will be agreed for launch. The code must be written to allow for additional templates to be defined in the future. | M |  |
| Navigation Review | 16.1 |  | a. Needs to happen but requires proper UX research before design and implementation | M |  |
| Looping Rails | 17.1 |  | a. Depending on effort; needs more discovery | S |  |
| Premier Experience Customisation | 18.1 |  | Dependency on Visual ID project. Some elements, brand colours etc should be configurable via service manager for UI. Question on whether this is being built to handle different brand colours based on user segment type. | S |  |
| Start Watching / Onboarding Flow | 19.1 |  | Review data when launched on Web to help inform UX and other platforms | M |  |
| End of Play Experience and Logic | 20.1 |  | Need to discuss with UX team - suggest workshop for this item, e.g. to leverage ThinkAnalytics, look at user cases, design layout etc | S |  |
| Trailer Playback and Presentation | 21.1 |  | Map out ideal journey and presentation (likely to be delivered as part of Coming Soon upgrade). | S |  |
| Parsing of UTM parameters | 22.1 |  | The website shall parse UTM parameters in the URLs and pass them to the analytics tools | M |  |
| Detect Jailbroken devices | 23.1 |  | Detect if the device is jailbroken and do not allow streaming of DRM encrypted content | M |  |