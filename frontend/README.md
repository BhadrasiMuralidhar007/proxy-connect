# Proximity Connect

A proximity-based discovery app scaffold. Users register as either **Straight**
(and pick their gender) or **LGBTQ+** (and pick an orientation tag), and the
discovery feed shows nearby people filtered by those rules.

## Structure

```
backend/    Spring Boot API (Java 17, H2 for dev / Postgres for prod, JWT auth)
frontend/   React + Vite web app (onboarding, login, discovery feed)
```

## How matching works

- **Straight users** see nearby users of the opposite gender who are also
  registered as Straight.
- **LGBTQ+ users** see nearby users whose orientation tag is "compatible"
  with theirs (e.g. Bisexual sees Gay, Lesbian, Bisexual, Pansexual, Queer).
  The compatibility table lives in one place —
  `backend/src/main/java/com/proximityconnect/service/MatchingService.java`
  — so you can tune it without touching anything else.

Distance is computed with the Haversine formula directly in the SQL query
(`UserRepository`), so only in-range candidates come back from the database.

## Running locally

**Backend** (needs Java 17 + Maven):
```
cd backend
mvn spring-boot:run
```
Starts on `http://localhost:8080`, using an in-memory H2 database (data resets
on restart). Swap `application.properties` for a Postgres URL when you're
ready for persistent data — the queries work unmodified against Postgres.

**Frontend** (needs Node 18+):
```
cd frontend
npm install
npm run dev
```
Starts on `http://localhost:5173`.

## Getting this onto the Play Store

The React frontend can be wrapped for Android (and iOS) with
[Capacitor](https://capacitorjs.com/) without a rewrite:
```
cd frontend
npm install @capacitor/core @capacitor/android
npx cap init
npx cap add android
npm run build && npx cap sync
npx cap open android   # opens in Android Studio to build/sign the APK/AAB
```
That gets you a real installable app backed by the same API. A fully native
app (Kotlin/Swift) is a bigger step up in build quality but a separate
codebase — worth considering later, not needed to launch.

## Before this goes live — worth budgeting time for

- **Photo upload & moderation** — this scaffold has no images yet; you'll
  want upload, storage (S3/Cloud Storage), and at minimum automated
  moderation before allowing public profile photos.
- **Reporting & blocking** — essential for any people-discovery app,
  not included here.
- **Safety/age verification** — confirm your onboarding requires 18+ and
  decide how you'll verify it.
- **Rate limiting & abuse prevention** on the discovery and auth endpoints.
- **Privacy** — decide how precise the "nearby" location shown to other
  users should be (exact vs. fuzzed to a radius) before shipping.
