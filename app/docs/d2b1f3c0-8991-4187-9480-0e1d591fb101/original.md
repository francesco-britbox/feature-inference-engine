# BritBox Web and Mobile Apps - Core HLR

**Last updated 15/01/2026**

## Status Legend

| Status | Meaning |
|--------|---------|
| ✅ | Currently Supported in BritBox App |
| 🔶 | Roadmapped Development |
| 📋 | Wishlist |
| ⬜ | Not Applicable |

---

## Start Up & Sign In

| Ref # | Overview | Detail | MOSCOW | WEB | iOS | Android | JIRA | Comments |
|-------|----------|--------|--------|-----|-----|---------|------|----------|

### App Launch

| Ref # | Overview | Detail | MOSCOW | WEB | iOS | Android | JIRA | Comments |
|-------|----------|--------|--------|-----|-----|---------|------|----------|
| 1.1 | App Launch Start-up Screen | a. Holding BritBox logo or animation as app loads | S | ⬜ | 📋 | 📋 | Y | Mobile apps only |
| 1.2 | App Launch Start-up Sound | a. Sound to be played whilst BritBox logo or animation loads | C | ⬜ | 📋 | 📋 |  |  |
| 1.3 | Paywall Page | a. Display Paywall page on app launch for non signed in users with relevant CTAs | M | ✅ | ✅ | ✅ | Y |  |
| 1.4 | Promo Landing Page | a. Display a Promo information to users when an active promo offer is available | M | ✅ | ✅ | ✅ | Y |  |
| 1.5 | OOC Page | a. Users will see an Out of Country page when accessing the website or app outside an allowed region | M | ✅ | ✅ | ✅ |  |  |

### Sign In

| Ref # | Overview | Detail | MOSCOW | WEB | iOS | Android | JIRA | Comments |
|-------|----------|--------|--------|-----|-----|---------|------|----------|
| 2.1 | OOC Sign In | a. Users will be able to sign in on the OOC Page in the EEA on the website or mobile app | M | ✅ | ✅ | ✅ |  |  |
| 2.2 | OOC Page after sign-in | a. Users will continue to see the OOC Page if not portable outside of allowed regions | M | ✅ | ✅ | ✅ |  |  |
| 2.3 | Sign Into Account Using Email/Password* | a. Users with a valid username / password will be able to sign in via the website and mobile app | M | ✅ | ✅ | ✅ |  |  |
|  |  | b. Users will see a relevant error message when sign in fails | M | ✅ | ✅ | ✅ |  |  |
|  |  | c Pre-fill PII data on Sign In with device user profile details (where possible) | M |  | 📋 | 📋 |  |  |
|  |  | d. User will see instructions if forgotten password | M | ✅ | ✅ | ✅ |  |  |
| 2.4 | Pin & Pair | a. User will see be able to pair their TV via /activate URL | M | ✅ | ⬜ | ⬜ |  |  |
| 2.5 | Reset password* | a. User is able to select a 'Forgot password' link | M | ✅ | ✅ | ✅ |  |  |
| 2.5 | Passsword Reset Link | b. User can request a email link to sign in | M | 📋 | 📋 | 📋 |  | Likely a Must now as we have launched in January. |
| 2.6 | Sign Out of Account | a. User will be able to sign out of BritBox account | M | ✅ | ✅ | ✅ |  |  |
## Sign Up & Billing

| Ref # | Overview | Detail | MOSCOW | WEB | iOS | Android | JIRA | Comments |
|-------|----------|--------|--------|-----|-----|---------|------|----------|

### Register*

| Ref # | Overview | Detail | MOSCOW | WEB | iOS | Android | JIRA | Comments |
|-------|----------|--------|--------|-----|-----|---------|------|----------|
| 3.1 | Register* | a. User can create a new user account in the Britbox website and mobile app | M | ✅ | ✅ | ✅ |  |  |
|  |  | b. User can pre-fill their email on registration with their Apple or Google account email | M | ⬜ | ✅ | ✅ |  |  |
|  |  | c. On registration, newsletter opt in/out is determined by the user's region. | M | ✅ | ✅ | ✅ |  |  |
|  |  | d. Region-specific text is displayed on Registration Screen | M | ✅ | ✅ | ✅ |  |  |
|  |  | e. User will be presented with suitable error messaging if registration fails | M | ✅ | ✅ | ✅ |  |  |
|  |  | f User is able to see Terms and Conditions when registering | M | ✅ | ✅ | ✅ |  |  |
|  |  | g. User is able to see Privacy Policy when registering | M | ✅ | ✅ | ✅ |  |  |
|  |  | h. User is able to see Cookie Policy when registering | M | ✅ | ✅ | ✅ |  | Currently only applies to NDX but should be extended to all regoins |
| 3.2 | Use Keyboard | a. User will be able to use the onscreen keyboard to input text (keyboard may be bespoke) | M | ⬜ | ✅ | ✅ |  |  |

### Subscription*

| Ref # | Overview | Detail | MOSCOW | WEB | iOS | Android | JIRA | Comments |
|-------|----------|--------|--------|-----|-----|---------|------|----------|
| 4.1 | Subscribe* | a. User can subscribe to available plans in region | M | ✅ | ✅ | ✅ |  |  |
|  |  | b. New users are entitled to free trial on first BritBox subscription if applicable | M | ✅ | ✅ | ✅ |  |  |
|  |  | c. Users will see region-specific text regarding subscription plans and amounts | M | ✅ | ✅ | ✅ |  |  |
|  |  | d. User will see suitable messaging if subscription fails/the process has been abandoned | M | ✅ | ✅ | ✅ |  |  |
|  |  | e. Users will see device-specific text regarding free trials/promotional offers | M | ✅ | ✅ | ✅ |  |  |
|  |  | f User is able to purchase promotional offer on any given plan (Pay As You Go / Pay Up Front) | M | ✅ | ✅ | ✅ |  |  |
|  |  | g. User is able to purchase a 'multi-month' promotional offer | M | ✅ | 📋 | 📋 |  | Depends on if supported in appstore for platform (supported for Web only) |
|  |  | h. Offer gift purchase & redemption flows (Totus?) | M | ✅ | ⬜ | ⬜ |  | Web only - link to from Mobile |
|  |  | i. Plans are not fixed, and additional Plans may be added at any time, eg monthly Premier, new Tiers | M | ✅ | ✅ | ✅ |  |  |
|  |  | j. Alternate Subscription Flow (Apple & Google) | C | ⬜ | 📋 | 📋 |  | Based on new EU ruling to allow non-IAP payment option - unlikely to be part of initial migration project; ensure scalable solution |
|  |  | k. User is presented with a onboarding journey | M | ✅ | 📋 | 📋 |  |  |
|  |  | l. Offer configurable upsell screen | M | ✅ | 📋 | 📋 |  |  |
|  |  | m. If the user signs up via the pin + pair flow then the order attribute must be added to the sign up | M | ✅ | 📋 | 📋 |  |  |
| 4.2 | Legal | a. At plan selection stage users must see legal text informing them that the plan will renew until canceled, and details of how to cancel | M | ✅ | ✅ | ✅ |  |  |
| 4.3 | Activation | a. User can activate a partner purchased subscription | M | ✅ | ✅ | ✅ |  |  |
## Content Discovery and Upsell

| Ref # | Overview | Detail | MOSCOW | WEB | iOS | Android | JIRA | Comments |
|-------|----------|--------|--------|-----|-----|---------|------|----------|

### Navigation

| Ref # | Overview | Detail | MOSCOW | WEB | iOS | Android | JIRA | Comments |
|-------|----------|--------|--------|-----|-----|---------|------|----------|
| 5.1 | Focus selection | a. User will be able to see the focus of their selection | M | ✅ | ✅ | ✅ |  |  |
| 5.2 | Display Top Navigation | a. User will be able to navigate to Category and Collection pages | M | ✅ | ✅ | ✅ |  |  |
|  |  | b. User will be able to navigate to Genre pages | M | ✅ | ✅ | ✅ |  |  |
|  |  | c. User will be able to navigate to account when signed in | M | ✅ | ✅ | ✅ |  |  |
|  |  | d. User will be able to navigate to Sign In CTA when not signed in | M | ✅ | ✅ | ✅ |  |  |
|  |  | e. User will be able to navigate to Sign up CTA when not signed in* | M |  | ✅ | ✅ |  | On platforms with IAP |
| 5.3 | Navigate on Page | a. User will be able to navigate through each page's focusable elements | M | ✅ | ✅ | ✅ |  |  |
|  |  | b. User will be able to select a focusable element and access the corresponding page / action | M | ✅ | ✅ | ✅ |  |  |
| 5.4 | Navigate Search Results | a. User will be able to navigate through search results | M | ✅ | ✅ | ✅ |  |  |
| 5.5 | Exit the App | a. User is able exit app and return to device home screen | M |  | ✅ | ✅ |  |  |

### Category Pages

| Ref # | Overview | Detail | MOSCOW | WEB | iOS | Android | JIRA | Comments |
|-------|----------|--------|--------|-----|-----|---------|------|----------|
| 6.1 | General Pages | a. User will be able to access a hero rail | M | ✅ | ✅ | ✅ |  |  |
|  |  | b. User will be able to access rails | M | ✅ | ✅ | ✅ |  |  |
|  |  | c. User will be able to access their Continue Watching rail | M | ✅ | ✅ | ✅ |  |  |
|  |  | d. User is able to remove content from the Continue Watching rail | M | ✅ | ✅ | ✅ |  |  |
|  |  | e. User can access Branded Titles and Rails | M | ✅ | ✅ | ✅ |  |  |
| 6.2 | Display Watchlist page | a. User can access their watchlist and add/remove items from their Watchlist | M | ✅ | ✅ | ✅ |  |  |
| 6.3 | Watch history/Watch again | a. User can view their watch history (completed shows and movies) and Watch again | S | 📋 | 📋 | 📋 |  | May be able to serve without the need for development work (i.e. generate via TA user case) |
| 6.4 | Provide Back to Top option | a. User will have a Back to Top option at the bottom of the screen | M | ✅ |  |  |  | Agree a min scope (discuss with Tobias) - aim is for user to get to top of page with ease, can consider different design options to solve this problem. |
| 6.5 | Identify Premier Content | a. User will be able to identify Premier content on Home Page rails, Genre Pages, Search results and A-Z pages | M | ✅ | ✅ | ✅ |  |  |
| 6.6 | Display Badges on Programmes | a. When applicable, badges (free, new episodes…) will be displayed with the programme tile  Regional Badges are supported | M | ✅ | ✅ | ✅ |  |  |

### Showpage - Season & Episodes

| Ref # | Overview | Detail | MOSCOW | WEB | iOS | Android | JIRA | Comments |
|-------|----------|--------|--------|-----|-----|---------|------|----------|
| 7.1 | Display Show details | a. User will be able to see the show page in line with agreed designs | M | ✅ | ✅ | ✅ |  | Most recent trailer from Hero |
| 7.2 | Availability Text | a. Coming Soon content will be returned in search results with a Coming Soon badge | M | ✅ | ✅ | ✅ |  |  |
| 7.3 | Availability CTA | a. User will see CTA if they need to subscribe or upgrade to watch the show, or see which is their next episode in sequence | M | ✅ | ✅ | ✅ |  |  |
| 7.4 | Display (watch) Trailer CTA | a. User will be able to select the Watch Trailer CTA on the programme pages | M | ✅ | ✅ | ✅ |  |  |
| 7.5 | Watchlist - Brands | a. User can add a brand to a watchlist | M | ✅ | ✅ | ✅ |  |  |
|  |  | b. User can remove a brand from their watchlist | M | ✅ | ✅ | ✅ |  |  |
| 7.6 | Display Region Specific Images | Users will see region specific images where applicable | M | ✅ | ✅ | ✅ |  |  |
| 7.7 | Display Region Specific Metadata | Users will see region specific metadata where applicable | M | ✅ | ✅ | ✅ |  |  |
| 7.8 | Display Region Specific Age Rating | a. Users in Canada will see the Canadian ratings for programmes | M | ✅ | ✅ | ✅ |  |  |
|  |  | b. Users in the US will see the US ratings for programmes | M | ✅ | ✅ | ✅ |  |  |
|  |  | c. Users in AU will see the AU ratings for programmes | M | ✅ | ✅ | ✅ |  |  |
|  |  | d. Users in SE/NO/FI/DK will see a G symbol for rated programmes (above TV-PG) | M | ✅ | ✅ | ✅ |  |  |
| 7.9 | Display Season details | a. User will be able to navigate through the various seasons and episodes in the brand | M | ✅ | ✅ | ✅ |  |  |
| 7.11 | Display Episode List | a. User can see the episodes in a season | M | ✅ | ✅ | ✅ |  |  |
|  |  | b. User can navigate through the episodes in a season | M | ✅ | ✅ | ✅ |  |  |
| 7.12 | Display episode details | a. User will be able to view the selected episode details as per agreed designs | M | ✅ | ✅ | ✅ |  |  |
| 7.13 | Display Availability Text | a. User  will be able to view appropriate availability text for each episode | M | ✅ | ✅ | ✅ |  |  |
| 7.14 | Display CTA | a. User will see a play CTA or a label if they need to upgrade where applicable on episode card | M | ✅ | ✅ | ✅ |  |  |
|  |  | b. Coming Soon' episodes will have no play CTA | M | ✅ | ✅ | ✅ |  |  |
| 7.15 | Display Trailers | a. User will be able to see all trailers available | M | ✅ | ✅ | ✅ |  | Ordering of trailers |
| 7.16 | Display Related Content | a. User will be able to see related content (MoreLikeThis) | M | ✅ | ✅ | ✅ |  |  |
| 7.17 | Display Extras | a. User can see the bonus features related to a season/brand | M | ✅ | ✅ | ✅ |  |  |
| 7.18 | Display Extras details | a. User will be able to view appropriate availability text for Extras | M | ✅ | ✅ | ✅ |  |  |
|  |  | b. Subscribers will see a play CTA or a label if they need to upgrade where applicable on Extras card | M | ✅ | ✅ | ✅ |  |  |
|  |  | c Coming Soon' Extras will have a gradient and no play CTA | M | ✅ | ✅ | ✅ |  |  |
| 7.19 | Display Episode progress view | a. When a user started playing an episode, the episode view progress bar is visible | M | ✅ | ✅ | ✅ |  |  |
| 7.20 | Display 'Coming Soon' Content for Show/Season | a. User will be able to see a new Show/Season of a show that will be 'Coming Soon' to the platform, view a synopsis, and watch a trailer, if available | M | ✅ | ✅ | ✅ |  | Part of 2.0 delivery |
| 7.21 | Coming Soon Enhancements | a. Indicate that content is unavailable to the user | M | ✅ | ✅ | ✅ |  |  |
| 7.22 | Display Credits information | a. When available, user will be able to view credits information (these will include cast and crew name) | M | ✅ | ✅ | ✅ |  |  |
| 7.23 | Unavailable Image | a. If an image is unavailable, a Britbox placeholder image will be displayed to the user | M | ✅ | ✅ | ✅ |  |  |
| 7.24 | Reflect BritBox Branding Throughout the site | a. Pages are consistent with BritBox branding | M | ✅ | ✅ | ✅ |  |  |

### Hero

| Ref # | Overview | Detail | MOSCOW | WEB | iOS | Android | JIRA | Comments |
|-------|----------|--------|--------|-----|-----|---------|------|----------|
| 7.25 | Hero Rail Enhancements | a. Hero rail will feature an updated badge design | M | ✅ | ✅ | ✅ |  | Will support multiple Hero types - minimum of 3 per Evolution app reqork for TVs. |
| 7.26 |  | b. Hero rail will support taglines | M | ✅ | ✅ | ✅ |  |  |
| 7.27 |  | c Hero rail will feature a redesigned Premier indicator (same rules apply to when it is shown (6.5)) | M | ✅ | ✅ | ✅ |  |  |

### Showpage - Movie

| Ref # | Overview | Detail | MOSCOW | WEB | iOS | Android | JIRA | Comments |
|-------|----------|--------|--------|-----|-----|---------|------|----------|
| 8.1 | Display Movie Page | a. User will be able to see the movie image as per agreed designs | M | ✅ | ✅ | ✅ |  |  |
| 8.2 | Availability Text | a. User  will be able to view appropriate availability text | M | ✅ | ✅ | ✅ |  |  |
| 8.3 | Availability CTA | a. User  will see CTA to play or if they need to subscribe or upgrade to watch | M | ✅ | ✅ | ✅ |  |  |
| 8.4 | Display (watch) Trailer CTA | a. User will be able to select the Watch Trailer CTA on the programme pages | M | ✅ | ✅ | ✅ |  |  |
| 8.5 | Watchlist - Movie | a. User can add a movie to a watchlist | M | ✅ | ✅ | ✅ |  |  |
|  |  | b. User can remove a movie from their watchlist | M | ✅ | ✅ | ✅ |  |  |
| 8.6 | Display Region Specific Images | a. Users will see region specific images where applicable | M | ✅ | ✅ | ✅ |  |  |
| 8.7 | Display Region Specific Metadata | a. Users will see region specific metadata where applicable | M | ✅ | ✅ | ✅ |  |  |
| 8.8 | Display Region Specific Age Rating | a. Users in Canada will see the Canadian ratings for programmes | M | ✅ | ✅ | ✅ |  |  |
|  |  | b. Users in the US will see the US ratings for programmes | M | ✅ | ✅ | ✅ |  |  |
|  |  | c. Users in AU will see the AU ratings for programmes | M | ✅ | ✅ | ✅ |  |  |
|  |  | d. Users in SE/NO/FI/DK will see a G symbol for rated programmes (above TV-PG) | M | ✅ | ✅ | ✅ |  |  |
| 8.9 | Display Movie progress view | a. When a user started playing a movie, the progress bar is visible | M | ✅ | ✅ | ✅ |  |  |
| 8.10 | Display Trailers | a. User will be able to see all trailers available | M | ✅ | ✅ | ✅ |  |  |
| 8.11 | Display Related Content | a. User will be able to see related content (MLT) | M | ✅ | ✅ | ✅ |  |  |
| 8.12 | Display 'Coming Soon' Content for Movie | a. User will be able to see Movies that will be 'Coming Soon' to the platform, view a synopsis, and watch a trailer, if available | M | ✅ | ✅ | ✅ |  |  |
|  |  | b. No 'Watch' CTA is displayed when the Movie is not playable (ie Coming Soon) | M | ✅ | ✅ | ✅ |  |  |
| 8.13 | Display Credits information | a. When available, user will be able to view credits information (these will include cast and crew name) | M | ✅ | ✅ | ✅ |  |  |
| 8.14 | Unavailable Image | a. If an image is unavailable, a Britbox placeholder image will be displayed to the user | M | ✅ | ✅ | ✅ |  |  |

### Live Event

| Ref # | Overview | Detail | MOSCOW | WEB | iOS | Android | JIRA | Comments |
|-------|----------|--------|--------|-----|-----|---------|------|----------|
| 9.1 | Access Live event page | a. During a live event, user is able to access the corresponding live event page and start playback | M | ✅ | ✅ | ✅ |  |  |

### Live Channels

| Ref # | Overview | Detail | MOSCOW | WEB | iOS | Android | JIRA | Comments |
|-------|----------|--------|--------|-----|-----|---------|------|----------|
| 9.1 | Access Live event page | a. User can access Live Channel Pages | M | ✅ | ✅ | ✅ |  | this needs amendment for 2.0 |
|  |  | b. User can see whats "on now" for all Channels | M | ✅ | ✅ | ✅ |  | edge cases / fallback logic |
|  |  | c User can see whats "on now and up next" for a given channel | M | ✅ | ✅ | ✅ |  |  |
|  |  | d User is able to see an EPG listing for all BritBox channels (EPG) | M | ✅ | 📋 | 📋 |  | Only on WEB currently |
|  |  | e User is able to link to full schedule from 'up next' rail | M | ✅ | 📋 | 📋 |  | Only on WEB currently |
|  |  | f User can link to show page for upcoming content in 'up next' rail | M | ✅ | ✅ | ✅ |  | *cover edge cases if future content |
|  |  | g. Ensuring support for live channels in other regions (US/CA/NDX) - will leverage same setup per AU Linear Channels | M | ✅ | ✅ | ✅ |  |  |

### Search

| Ref # | Overview | Detail | MOSCOW | WEB | iOS | Android | JIRA | Comments |
|-------|----------|--------|--------|-----|-----|---------|------|----------|
| 10.1 | Search for Content | a. User will be able to search for content (show title/movie title, cast and crew, fuzzy matching, special operators) | M | ✅ | ✅ | ✅ |  | *Dynamic search to be implemented via backend |
|  |  | b. Relevant results will be displayed to the user | M | ✅ | ✅ | ✅ |  |  |
|  |  | c. User will be able to select the search result to access the corresponding page | M | ✅ | ✅ | ✅ |  |  |
|  |  | d User shall be able to see recent searches and recommendation rails on the search page | S | ✅ | ✅ | ✅ |  | We're assuming recs are available for new search |
|  |  | e User shall be able to see a recommendation rails on the search page | M | ✅ | ✅ | ✅ |  |  |
|  |  | f Coming Soon content will be returned in search results | S | ✅ | ✅ | ✅ |  |  |
| 10.2 | Browse A-Z | a. User is able to browse shows through A-Z | M | ✅ | ✅ | ✅ |  |  |
|  |  | b. Selecting a show through the A-Z will take the user to the corresponding page | M | ✅ | ✅ | ✅ |  |  |
| 10.3 | Pre-populated Search - Initial Landing Page | a. Show trending or recommended items on initially loading the search page | M | ✅ | ✅ | ✅ |  |  |
| 10.4 | Identifying Premier Content | P User will see a Premier Content identifier on Premier content and badges, on search results and browsing | M | ✅ | ✅ | ✅ |  |  |
## Player

| Ref # | Overview | Detail | MOSCOW | WEB | iOS | Android | JIRA | Comments |
|-------|----------|--------|--------|-----|-----|---------|------|----------|

### Player

| Ref # | Overview | Detail | MOSCOW | WEB | iOS | Android | JIRA | Comments |
|-------|----------|--------|--------|-----|-----|---------|------|----------|
| 11.0 | Player Integration | a. Integrate latest Bitmovin player version | M | ✅ | ✅ | ✅ |  |  |

### Playback Content Types

| Ref # | Overview | Detail | MOSCOW | WEB | iOS | Android | JIRA | Comments |
|-------|----------|--------|--------|-----|-----|---------|------|----------|
| 11.1 | Watch Trailer | a. User is able to watch a trailer | M | ✅ | ✅ | ✅ |  |  |
| 11.2 | Watch Episode/Movie/Extras | a. User is able to watch an episode / movie / extras | M | ✅ | ✅ | ✅ |  |  |
|  |  | b. User must be entitled to watch episode / movie / extras (unless Free) | M | ✅ | ✅ | ✅ |  |  |
| 11.3 | Watch Live Stream | a. User is able to watch a live event stream | M | ✅ | ✅ | ✅ |  |  |
|  |  | b. User must be entitled to watch live stream | M | ✅ | ✅ | ✅ |  |  |
|  |  | c. Live Stream Playback controls will be limited to play/pause/restart for live stream events | C | ✅ | ✅ | ✅ |  | Can't currently pause or restart (Pausing is native to tvOS) |
|  |  | d. Live Channel MVP+Linking to VOD, Bottom Shelf for linking to EPG schedule, Pause/Resume, Restart Current Show | M | ✅ | ✅ | ✅ |  |  |
| 11.4 | Watch BritBox Channels | a. User is able to watch BritBox channels | M | ✅ | ✅ | ✅ |  |  |
| 11.5 | Watch Free Episode | a. User is able to watch free episodes (no entitlement check) | M | ✅ | ✅ | ✅ |  |  |
| 11.7 | Playback DRM Content | a. User will be able to play DRM content (Widevine, Playready, Fairplay depending on device) | M | ✅ | ✅ | ✅ |  |  |
|  |  | b. User will see DRM specific error messages if playback fails | M | ✅ | ✅ | ✅ |  |  |
| 11.8 | Pre Rolls | a User will see targeted Pre rolls based on setup | M | ✅ | ✅ | ✅ |  | NFR: add note that must not be called an advertisement |
|  |  | b. User will be able to skip a pre roll if configured in setup | M | ✅ | ✅ | ✅ |  |  |
|  |  | c. User will be able to add to watchlist from a pre roll | C | 📋 | 📋 | 📋 |  |  |
|  |  | d. User will be able to upgrade to higher tier from a pre roll | C | 📋 | 📋 | 📋 |  |  |
| 11.9 | Video Preview | a. User will be able to preview video from rail or hero (see notes) | C | 📋 | 📋 | 📋 |  | Need to work on ideal experience (e.g. expanded rails that play content, what content plays) |

### Downloads

| Ref # | Overview | Detail | MOSCOW | WEB | iOS | Android | JIRA | Comments |
|-------|----------|--------|--------|-----|-----|---------|------|----------|
| 12.1 | Downloads | a Display download indicators for user type | M | 📋 | ✅ | ✅ |  |  |
|  |  | b. User is able to manage their downloads library | M | 📋 | ✅ | ✅ |  |  |
|  |  | c Content protection rules apply to downloaded content | M | 📋 | ✅ | ✅ |  |  |
|  |  | d Business rules for downloads are applied to downloaded content | M | 📋 | ✅ | ✅ |  |  |
|  |  | e User is able to play content offline | M | 📋 | ✅ | ✅ |  |  |
|  |  | f User can Download content as defined for their region & tier | M | 📋 | ✅ | ✅ |  |  |

### Playlist

| Ref # | Overview | Detail | MOSCOW | WEB | iOS | Android | JIRA | Comments |
|-------|----------|--------|--------|-----|-----|---------|------|----------|
| 13.1 | Playlist | a. Display and play content from a playlist | C | ✅ | 📋 | 📋 |  |  |

### Regulatory & Business Rule Player Features

| Ref # | Overview | Detail | MOSCOW | WEB | iOS | Android | JIRA | Comments |
|-------|----------|--------|--------|-----|-----|---------|------|----------|
| 14.1 | Display Close Caption | a. When close captions exist, the user will be able to turn them on/off in the player | M | ✅ | ✅ | ✅ |  |  |
|  |  | b. User will only see English Captions outside of Nordics | M | ✅ | ✅ | ✅ |  | Fallbacks to English if not available in NDX |
|  |  | c. In Nordics user will see all available captions | M | ✅ | ✅ | ✅ |  |  |
|  |  | d. Closed captions settings will persist for any given content | M | ✅ | ✅ | ✅ |  |  |
|  |  | e Closed captions settings will persist after app exit | S | ✅ | ✅ | ✅ |  | Must? |
|  |  | f User is able to apply CC styling on device settings where applicable | M | ⬜ | ⬜ | ⬜ |  | Need to check if this is possible on mobile and Web |
|  |  | g. Match Subtitle Size and Styling from device settings and react accordingly. As a minimum we should match where we do this already - Apple, Android and Roku devices. | M | ⬜ | ⬜ | ⬜ |  | Need to check if this is possible on mobile and Web |
| 14.2 | Prompt for Parental Control PIN | a. User is prompted to enter a valid PIN when Parental Control is activated and programme rating is more restrictive than the selected parental control | M | ✅ | ✅ | ✅ |  |  |
| 14.3 | Concurrent Stream Capping | a. User will see CSC specific error messages if exceeding Playback limits | M | ✅ | ✅ | ✅ |  |  |
| 14.4 |  | b. User will have concurrent stream limits as defined by business (by region, tier, provider) | M | ✅ | ✅ | ✅ |  |  |
| 14.5 |  | c. User will see messaging on how to increase their Stream Limit (i.e. upsell) | M | ✅ | ✅ | ✅ |  | **This is currently in progress on D3 so is a MUST** |
| 14.6 | Display rating/content warning | a. At start of playback, and on resuming playback, rating and content warning (if present) must be displayed (for 5 seconds) on screen, for both VOD and live channels | M | ✅ | ✅ | ✅ |  |  |
| 14.7 | Display VPN detected message | a. When player receives a 403 error, display friendly message to user that they are on a VPN and/or outside an allowed region | M | ✅ | ✅ | ✅ |  |  |
| 14.8 | Error Messaging | a User will see an informed error message with applicable code | M | ✅ | ✅ | ✅ |  |  |

### User Experience Player Features

| Ref # | Overview | Detail | MOSCOW | WEB | iOS | Android | JIRA | Comments |
|-------|----------|--------|--------|-----|-----|---------|------|----------|
| 15.1 | Continue Watching | a. User can continue watching an episode / movie from where they last left off from the Continue Watching List (note, Trailers/VAMs not added to Continue Watching rail) | M | ✅ | ✅ | ✅ |  |  |
|  |  | b. User can remove item from Continue Watching | M | ✅ | ✅ | ✅ |  |  |
|  |  | c User shall be taken to IDP before CW | M | ✅ | ✅ | ✅ |  |  |
|  |  | d Continue Watching Outside app - Has to be done for some platforms (iOS) | M | ⬜ | ✅ | ⬜ |  |  |
| 15.2 | Autoplay | a. At end of episode playback, when the next episode is available, the playback of the next episode will automatically start after a defined countdown | M | ✅ | ✅ | ✅ |  |  |
|  |  | b. User can cancel the next playback from starting | M | ✅ | ✅ | ✅ |  |  |
|  |  | c. User can select the next episode to playback to start before the countdown is over | M | ✅ | ✅ | ✅ |  |  |
|  |  | d At end of playback, when next episode is Premier content, and user has standard account, there will be no countdown, and 'upgrade to watch' CTA will be displayed | M | ✅ | ✅ | ✅ |  |  |
|  |  | e If user upgrades account to watch they will be returned to the IDP | M | ✅ | ✅ | ✅ |  |  |
|  |  | f At end of playback, when there isn't a next episode available, user will see recommended titles | M | ✅ | ✅ | ✅ |  |  |
|  |  | g. At end of playback, when next episode is 'Coming Soon', user will see recommended titles | M | ✅ | ✅ | ✅ |  |  |
|  |  | h. User can disable Autoplay | S |  |  |  |  | Needs an additional setting in the users profile |
| 15.3 | Control Playback | a. User is able to Play or resume content | M | ✅ | ✅ | ✅ |  |  |
|  |  | b. User is able to Pause playback | M | ✅ | ✅ | ✅ |  |  |
|  |  | c. User is able to FFWD, RWD with multiple speed options | M | ✅ | ✅ | ✅ |  |  |
|  |  | d. User can view thumbnails (scrubbing) on playback (when available) | M | ✅ | ✅ | ✅ |  |  |
|  |  | e. User is able to exit the player and return to previous page | M | ✅ | ✅ | ✅ |  |  |
|  |  | f. User is able to see Episode/Movie metadata in player | M | ✅ | ✅ | ✅ |  |  |
|  |  | g. User is able to skip to next episode in player | M | ✅ | ✅ | ✅ |  |  |
|  |  | h User is able to select whether to resume or restart playback for Episodes, Movies | M | ✅ | ✅ | ✅ |  |  |
| 15.5 | Binge Markers | a. Skip Intro, Skip Credits, Skip Episode Recap | S | 📋 | 📋 | 📋 |  | Data available from Movida |
## Core Functionality

| Ref # | Overview | Detail | MOSCOW | WEB | iOS | Android | JIRA | Comments |
|-------|----------|--------|--------|-----|-----|---------|------|----------|

### Geolocation

| Ref # | Overview | Detail | MOSCOW | WEB | iOS | Android | JIRA | Comments |
|-------|----------|--------|--------|-----|-----|---------|------|----------|
| 16.1 | Detect User's Region | a. Anonymous User's region will automatically be detected based on IP address | M | ✅ | ✅ | ✅ |  |  |
| 16.2 | Send User to Region's Page | a. Users accessing the site and app from within the US will see the US version of the site and app | M | ✅ | ✅ | ✅ |  | Based on EVergent catalog country response for signed in users |
|  |  | b. Users accessing the site and app from within Canada will see the Canadian version of the site and app | M | ✅ | ✅ | ✅ |  |  |
|  |  | c. Users accessing the site and app from within Australia will see the Australian version of the site and app | M | ✅ | ✅ | ✅ |  |  |
|  |  | d. User accessing the site and app from within Norway will see the Norwegian version of the site and app (except for EEA Portability region) | M | ✅ | ✅ | ✅ |  |  |
|  |  | e. User accessing the site and app from within Sweden will see the Swedish version of the site and app (except for EEA Portability region) | M | ✅ | ✅ | ✅ |  |  |
|  |  | f. User accessing the site and app from within Denmark will see the Danish version of the site and app (except for EEA Portability region) | M | ✅ | ✅ | ✅ |  |  |
|  |  | g. User accessing the site and app from within Finland will see the Finnish version of the site and app (except for EEA Portability region) | M | ✅ | ✅ | ✅ |  |  |
|  |  | h. User accessing the site and app from outside a BritBox region (US/CA/AU/DK/FI/SE/NO) will see the out of region page | M | ✅ | ✅ | ✅ |  |  |

### Portability

| Ref # | Overview | Detail | MOSCOW | WEB | iOS | Android | JIRA | Comments |
|-------|----------|--------|--------|-----|-----|---------|------|----------|
| 17.1 | Portability Region | a. EEA Portability rules must be applied for users travelling to a valid region. Only applicable to NDX users | M | ✅ | ✅ | ✅ |  |  |
|  |  | b. Portable EEA users accessing the app from non supported regions in Europe will see their home country catalog after sign in and their downloaded content | M | ✅ | ✅ | ✅ |  |  |
|  |  | c. Portable EEA users accessing the website and app from non supported regions in Europe will not be able to subscribe | M | ✅ | ✅ | ✅ |  |  |
|  |  | d. Portable EEA users accessing the app in NDX regions will see their home country catalog after sign in | M | ✅ | ✅ | ✅ |  |  |

### Deeplinking

| Ref # | Overview | Detail | MOSCOW | WEB | iOS | Android | JIRA | Comments |
|-------|----------|--------|--------|-----|-----|---------|------|----------|
| 18.1 | Deeplink into content | a. User will be able to deeplink into the site and app specific show/movie/season/category/collection pages | M | ✅ | ✅ | ✅ |  |  |
| 18.2 | Deeplink to playback | a. User will be able to deeplink directly to playback | M | ✅ | ✅ | ✅ |  |  |

### Base App Functionality

| Ref # | Overview | Detail | MOSCOW | WEB | iOS | Android | JIRA | Comments |
|-------|----------|--------|--------|-----|-----|---------|------|----------|
| 19.1 | Multi-Language - Label Support | a. Allow for configurable in app labels to support changing text & language references without hardcoding text | S | 📋 | 📋 | 📋 |  | NFR |
| 19.2 | Accessibility | a. Accessibility must be addressed - font sizes etc - need to define 'must' requirements | M | ✅ | 📋 | 📋 |  | Run a scan of the site and ensure Level AA WCAG 2.2 compliance |
| 19.4 | Error codes | a. A list of error codes will be maintained with Britbox-agreed messaging for each | M | ✅ | ✅ | ✅ |  |  |
| 19.5 | App Version | a. App must display current app version | M | ✅ | ✅ | ✅ |  |  |
| 19.6 | Segmentation | a. Provide tailored experience through user segmentation | M | ✅ | ✅ | ✅ |  |  |
| 19.7 | AB Testing | a. Provide AB Testing integration | M | ✅ | 📋 | 📋 |  | Need to assess aproach (e.g. Optimizely, Axis Segments, etc) - initial plan will be via ABCDE segment from Profile API. Will need to test for performance impact. |
## Account

| Ref # | Overview | Detail | MOSCOW | WEB | iOS | Android | JIRA | Comments |
|-------|----------|--------|--------|-----|-----|---------|------|----------|

### Manage Account

| Ref # | Overview | Detail | MOSCOW | WEB | iOS | Android | JIRA | Comments |
|-------|----------|--------|--------|-----|-----|---------|------|----------|
| 20.1 | Account | a User can manage account information (email, name) | M | ✅ | ✅ | ✅ |  |  |
|  |  | b Account Page will display the relevant (current) subscription status and package | M | ✅ | ✅ | ✅ |  |  |
|  |  | c User can reset their password | M | ✅ | ✅ | ✅ |  |  |

### Manage Subscription

| Ref # | Overview | Detail | MOSCOW | WEB | iOS | Android | JIRA | Comments |
|-------|----------|--------|--------|-----|-----|---------|------|----------|
| 21.1 | Sign up | a Unsubscribed users can subscribe from Account page * (web only) | M | ✅ | ✅ | ✅ |  |  |
| 21.2 | Billed by Partner - information | a. If subscribed via a different platform, provide relevant messaging to manage subscription | M | ✅ | ✅ | ✅ |  |  |
| 21.3 | Upgrade/Downgrade Subscription* | a. From the account page, users can change their current plan (web only) | M | ✅ | 📋 | 📋 |  |  |
| 21.4 |  | b From the account page, users can see instructions on how to change their plan | M | ✅ | ✅ | ✅ |  |  |
| 21.6 | Portability | a. Account page must provide legal copy on portability rules and instructions in the Nordics | M | ✅ | ✅ | ✅ |  |  |
| 21.7 | Newsletters/Email | a. Account page must provide instructions on how to change newsletter preferences | M | ✅ | ✅ | ✅ |  |  |
| 21.8 | Cancellation | a. User is presented with downgrade options | M | ✅ | 📋 | 📋 |  | Not needed for MVP on mobile |
|  |  | b. User is presented with a cancelation survey with radomised order of reasons | M | ✅ | 📋 | 📋 |  | Not needed for MVP on mobile |
|  |  | c User is presented with personalised content | M | ✅ | 📋 | 📋 |  | Not needed for MVP on mobile |
|  |  | d User is presented with personalised retention offers | M | ✅ | 📋 | 📋 |  | Not needed for MVP on mobile |
| 21.9 | Update Payment Method | a. User can update their payment method | M | ✅ | 📋 | 📋 |  | Not needed for MVP on mobile |

### Legal

| Ref # | Overview | Detail | MOSCOW | WEB | iOS | Android | JIRA | Comments |
|-------|----------|--------|--------|-----|-----|---------|------|----------|
| 22.1 | Display T&C page | a. Display T&C page | M | ✅ | ✅ | ✅ |  |  |
| 22.2 | Display Privacy Policy Page | a. Display Privacy Policy Page | M | ✅ | ✅ | ✅ |  |  |
| 22.3 | Display Cookie Policy Page | a. Display Cookie Policy Page | M | ✅ | ✅ | ✅ |  | Currently, we only have a separate Cookie Notice in the Nordics. Cookie usage in the other territories is captured in the privacy notice. |

### Parental Control

| Ref # | Overview | Detail | MOSCOW | WEB | iOS | Android | JIRA | Comments |
|-------|----------|--------|--------|-----|-----|---------|------|----------|
| 23.1 | Set Parental Control | a. User will be able to activate parental control and set their PIN | M | ✅ | ✅ | ✅ |  |  |
| 23.2 | Display Parental Control Settings | a. User will be able to see their parental rating setting with relevant messaging | M | ✅ | ✅ | ✅ |  |  |
| 23.3 | Disable Parental Control | a. User will be able to disable their parental control setting | M | ✅ | ✅ | ✅ |  |  |
## Personalisation

| Ref # | Overview | Detail | MOSCOW | WEB | iOS | Android | JIRA | Comments |
|-------|----------|--------|--------|-----|-----|---------|------|----------|

### Think Analytics

| Ref # | Overview | Detail | MOSCOW | WEB | iOS | Android | JIRA | Comments |
|-------|----------|--------|--------|-----|-----|---------|------|----------|
| 24.1 | Display Personalised rails | a. User can view personalised recommendation (via Think Analytics) on hero or rails on category pages (Homepage/Genre pages/ Collection pages…) | M | ✅ | ✅ | ✅ |  | assumption is that this will be served by the new recommendation service manager |
| 24.2 | Display Personalised More Like This rail | a. User can view personalised recommendation (via Think Analytics rails) for the More Like This section on Show/Movie pages | M | ✅ | ✅ | ✅ |  |  |
| 24.3 | Display Personalised Recommendations | a. User can view personalied recommendations at end of playback where applicable | S | 📋 | 📋 | 📋 |  |  |
| 24.4 | Send Learn Action - play | a. The app and website will pass through a play learn action call when the user has passed the 30% video length on playback | M | ✅ | ✅ | ✅ |  |  |
| 24.5 | Send Learn Action - stop playback | a. The app and website will pass through a stop play learn action call when the user stops playback (does NOT apply to pausing) | M | ✅ | ✅ | ✅ |  |  |
| 24.6 | Send Learn Action - Add to Watchlist | a. The app and website will pass through an add to watchlist learn action call when the user adds a show/movie to their watchlist | M | ✅ | ✅ | ✅ |  |  |
| 24.7 | Send  Learn Action - Remove from Watchlist | a. The app and website will pass through a remove from watchlist learn action call when the user removes a show/movie from their watchlist | M | ✅ | ✅ | ✅ |  |  |
| 24.8 | Send  Learn Action - Search clicks | a. The app and website will pass through a search click learn action call when the user clicks on a show/movie from their seach results | S | 📋 | 📋 | 📋 |  |  |
| 24.9 | Send Learn Action - Like/Dislike | a. The app and website will pass through an action when user selects like/dislike button on show/Movie | S | 📋 | 📋 | 📋 |  |  |
## Regulatory

| Ref # | Overview | Detail | MOSCOW | WEB | iOS | Android | JIRA | Comments |
|-------|----------|--------|--------|-----|-----|---------|------|----------|

### Regulatory

| Ref # | Overview | Detail | MOSCOW | WEB | iOS | Android | JIRA | Comments |
|-------|----------|--------|--------|-----|-----|---------|------|----------|
| 25.1 | Cookie Management | a. Allow users to Opt-In & Opt-Out of Cookies being stored on their device | M | ✅ | 📋 | 📋 |  |  |
## Analytics

| Ref # | Overview | Detail | MOSCOW | WEB | iOS | Android | JIRA | Comments |
|-------|----------|--------|--------|-----|-----|---------|------|----------|

### Analytics

| Ref # | Overview | Detail | MOSCOW | WEB | iOS | Android | JIRA | Comments |
|-------|----------|--------|--------|-----|-----|---------|------|----------|
| 26.1 | Send analytics events on page views | a. Page events are sent to ATI/Piano on page load | M | ✅ | ✅ | ✅ |  |  |
|  |  | b. Page content metadata is sent in event payload | M | ✅ | ✅ | ✅ |  |  |
|  |  | c. Platform attribution is sent in event payload | M | ✅ | ✅ | ✅ |  |  |
|  |  | d. User identifier and properties are sent in event payload | M | ✅ | ✅ | ✅ |  |  |
|  |  | e. Visit identifier and referreral are sent in event payload | M | ✅ | ✅ | ✅ |  |  |
| 26.2 | Send analytics events on playback behaviour | a. Media events are sent to ATI/Piano | M | ✅ | ✅ | ✅ |  |  |
|  |  | b. Content metadata is sent in event payload | M | ✅ | ✅ | ✅ |  |  |
|  |  | c. Platform attribution is sent in event payload | M | ✅ | ✅ | ✅ |  |  |
|  |  | d. User identifier and properties are sent in event payload | M | ✅ | ✅ | ✅ |  |  |
|  |  | e. Visit identifier and referreral are sent in event payload | M | ✅ | ✅ | ✅ |  |  |
|  |  | f. Custom properties are sent in event payload (AV Insights) | M | ✅ | ✅ | ✅ |  |  |
| 26.3 | Send analytics events on clicks | a. Click events are sent to ATI/Piano | M | ✅ | ✅ | ✅ |  |  |
|  |  | b. Element target identifier is sent in event payload | M | ✅ | ✅ | ✅ |  |  |
|  |  | c. User identifier and properties are sent in event payload | M | ✅ | ✅ | ✅ |  |  |
| 26.4 | Send analytics events on focus events | a. Impressions events are sent to ATI/Piano | M | ✅ | ✅ | ✅ |  |  |
|  |  | b. Element target identifier is sent in event payload | M | ✅ | ✅ | ✅ |  |  |
|  |  | c. User identifier and properties are sent in event payload | M | ✅ | ✅ | ✅ |  |  |
| 26.5 | Player Analytics | a. Additional analytics tags are sent to Bitmovin for custom fields | M | ✅ | ✅ | ✅ |  |  |
| 26.6 | Subscription | a. Tracking events are sent to Ati/Piano on apps and GA4 on Web on subscription journey steps as per specifications | M | ✅ | ✅ | ✅ |  |  |
## Upsell

| Ref # | Overview | Detail | MOSCOW | WEB | iOS | Android | JIRA | Comments |
|-------|----------|--------|--------|-----|-----|---------|------|----------|

### Upsell Journey

| Ref # | Overview | Detail | MOSCOW | WEB | iOS | Android | JIRA | Comments |
|-------|----------|--------|--------|-----|-----|---------|------|----------|
| 27.1 | Upsell Journey | a User will see relevant instructions on how to upgrade based on their tier and billing provider | M | ✅ | ✅ | ✅ |  |  |
|  |  | b User is able to upgrade to higher tier on device (IAP) | M | ✅ | ✅ | ✅ |  |  |
|  |  | c App will refresh after successful upgrade | M | ✅ | ✅ | ✅ |  |  |
|  |  | d Capture User's accessing on Upsell screens in Blueshift | M | 🔶 | 🔶 | 🔶 |  |  |
## Recurly

| Ref # | Overview | Detail | MOSCOW | WEB | iOS | Android | JIRA | Comments |
|-------|----------|--------|--------|-----|-----|---------|------|----------|

### Recurly

| Ref # | Overview | Detail | MOSCOW | WEB | iOS | Android | JIRA | Comments |
|-------|----------|--------|--------|-----|-----|---------|------|----------|
| 28.1 | Banner & Prompt Support | a Users will be able to see and click horizontal banners from Recurly | M | ✅ | ✅ | ✅ |  |  |
|  |  | b Users will be able to see and click on text only banners from Recurly | M | ✅ | ✅ | ✅ |  |  |
|  |  | c Users will be able to click through all banner types to pop-up actions | M | ✅ | ✅ | ✅ |  |  |
|  |  | d Users interactions with Recurly prompts will be tracked in Recurly Portal & ATi/Piano | M | ✅ | ✅ | ✅ |  |  |
|  |  | e Users will be able to see page based triggers (popups for specfic url paths) | M | ✅ | ✅ | ✅ |  |  |