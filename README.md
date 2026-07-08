# vesta — Personal Safety Check-In App

A timed check-in and emergency alert app. Start a timer before walking home or meeting someone; if you don't check back in, trusted contacts are alerted automatically with your location. A one-tap SOS button handles immediate emergencies independently of the timer.

## Features

- **Timed Check-In** — set a label and duration, then cancel ("I'm Safe") before it expires
- **Extend** — add time to an active check-in without restarting it
- **One-Tap SOS** — immediate alert to trusted contacts, independent of any check-in
- **Trusted Circle** — manage the contacts who receive alerts
- **Timeline** — history of check-ins and alerts
- **Vault** — secure storage for sensitive information shared only during an alert
- **Location handling** — check-in starts immediately using a cached location fix, then upgrades to a precise GPS fix in the background; SOS requires a live location fix before sending, since an alert without location is not actionable for responders
- **Server-side timers** — expiry is scheduled on the backend rather than tracked on-device, so it fires even if the app is closed or the device loses power

## Tech Stack

Expo / React Native, Convex (real-time database, mutations, scheduled functions), expo-location, Expo Router

## Architecture

```
┌──────────────────────┐         ┌───────────────────────────┐
│   Expo / React        │ hooks   │          Convex             │
│   Native client        │◄──────►│  (queries / mutations /     │
│                        │         │   scheduled functions)      │
└──────────────────────┘         └───────────────────────────┘
          │                                    │
          │ expo-location                      │ ctx.scheduler
          ▼                                    ▼
   Device GPS / cache               Server-side timers
                                     (expiry, alert dispatch)
```

The check-in countdown is scheduled on the Convex backend via `ctx.scheduler`, not tracked with a client-side timer. This means expiry and alert dispatch still occur on time even if the app is closed, backgrounded, or the device loses connectivity. The client-side timer display is presentational only and is not the source of truth for when an alert fires.

Location is handled differently depending on urgency: check-in favors speed and starts with a cached fix, refining in the background once a live GPS fix resolves. SOS favors certainty and will not send until a location fix is available, since a delayed alert with location is preferable to an immediate one without it.

## File Structure

```
app/
  (tabs)/
    _layout.tsx
    checkin.tsx             Check-in timer screen
    circle.tsx              Trusted contacts management
    home.tsx                Home screen
    sos-placeholder.tsx     SOS entry point within tab navigation
    timeline.tsx            History of check-ins and alerts
    vault.tsx                Secure information storage
    VaultScreenContent.tsx
  auth/
    _layout.tsx
    index.tsx
    modal.tsx
    sos.tsx                  Emergency SOS screen

assets/
components/
constants/                  Shared theme and configuration
contexts/                   Auth and other app-wide context providers
convex/                     Backend: queries, mutations, scheduled functions
hooks/                      Shared client-side logic (location, timers, etc.)
scripts/
utils/
```
