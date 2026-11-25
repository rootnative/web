---
id: benchmarks
title: Benchmarks
description: How @rootnative/web compares with react-native-web 0.21 in three apps. Size, load, interactions, and the results that are worse.
---

# Benchmarks

We moved three apps from react-native-web 0.21.4 to `@rootnative/web` 0.0.8, and measured each app on both runtimes in November 2026. This page gives every result, also the results that are worse. Your app can differ, so measure it too: see [Measure your own app](#measure-your-own-app).

## Summary

What you gain:

- **Less script at load.** Script time at load is 8–20 % lower in all three apps.
- **Smaller server HTML.** With static output, the HTML is 31–57 % smaller after gzip, and it has about half the CSS rules. A style is a shared class, not a `style` attribute: one home page has 1 `style` attribute in place of 220.
- **Faster interactions where JavaScript runs.** A menu opens 24 % faster, and a dialog 26 % faster. Typing in a text field runs 42 % less script, and a scroll runs 15–21 % less.
- **Lighthouse.** On the static site, Total Blocking Time is 18–52 % lower, and the performance score is higher in 17 of 19 pairs of runs.
- **A little less JavaScript.** The bundle is 2–4 % smaller after gzip. Most of a bundle is React, the router, and other libraries, and the runtime doesn't change those.
- **The same page.** On the static site, the home page and the 404 page are the same pixel for pixel. The showcase page differs only where the browser scales the screenshots (0.03 % of the pixels). Each page has the same tab stops, links, and headings.

What's worse:

- **Style work in some interactions.** Style recalculation is 90 % higher for a menu and 54 % higher for button presses in the component gallery. It's 24 % higher for a scroll on one phone-sized page. Without the CPU throttle, that's a few milliseconds for each interaction, and the script time of the same interactions is the same or lower. The cause isn't known yet.
- **Style work at load on one page.** The text field page of the gallery has 74 % more style recalculation at load. The other 6 pages have 11–67 % less.
- **Layout time** at load is 2 % higher on the dashboard, and 7 % higher on one phone-sized page of the static site. The gallery has less layout time on 6 of 7 pages.
- **Images in the server HTML come first.** The browser requests them before the first paint, and the first paint comes 14 ms later on one phone-sized page. On the simulated slow 4G of Lighthouse, Time to Interactive came 0.6 s later on the same page. In exchange, LCP is 7–14 % sooner in the other three page groups. For an image below the fold, use `loading="lazy"` (see [Image](/image)): the browser then loads it later, and React's server render doesn't preload it.

Not measured:

- Firefox and Safari. Each number comes from Chromium.
- A real phone and a real network. The phone-sized numbers come from a 390 px window with a CPU throttle.
- A screen reader. The checks count roles, links, and tab stops.

## The apps

| App               | Output                                            | Pages          | JavaScript, gzip, on react-native-web |
| ----------------- | ------------------------------------------------- | -------------- | ------------------------------------- |
| Static site       | Expo Router, `web.output: 'static'`               | 3              | 653 KB                                |
| Dashboard         | Expo, `web.output: 'single'`, no server rendering | 1              | 402 KB                                |
| Component gallery | Expo Router, `web.output: 'static'`               | 48, 7 measured | 712 KB                                |

Each app uses Reanimated and a component library on top of React Native. Each app moved through `@rootnative/web-expo`: see [Expo](/expo).

## How we measured

- Two exports of each app from the same commit: one on react-native-web 0.21.4, one on `@rootnative/web` 0.0.8. Only the runtime differs.
- Both exports load from a local server in Chromium 156, headless, with a new browser context for each run and the cache off.
- The CPU is throttled 4× on an Intel Core i5-8257U (4 cores). The window is 1280 × 800. The static site also runs at 390 × 844.
- On the static site and the dashboard, requests to other hosts come from a cache or from fixed answers, so the network doesn't count.
- 10 runs of each runtime, in turns. The tables give the median.
- On the static site, "better" and "worse" come from a sign test on the 10 pairs of runs: one runtime is lower in 9 pairs or more (p < 0.05). For the other two apps, the tables give the medians only.
- Lighthouse 13.5 on the static site: 5 runs of each runtime, with the mobile and the desktop preset.

## Static site

Three pages: a home page, a showcase page with app screenshots, and a 404 page. The move changed two files: `package.json`, and a new `metro.config.js` of 4 lines.

### Size

| Measure                                   | react-native-web | `@rootnative/web` | Change |
| ----------------------------------------- | ---------------- | ----------------- | ------ |
| JavaScript, all files, gzip               | 653 KB           | 637 KB            | −2.4 % |
| Modules in the client bundle              | 1,301            | 1,223             | −78    |
| Server HTML, gzip, home page              | 10.8 KB          | 7.5 KB            | −31 %  |
| Server HTML, gzip, showcase page          | 9.5 KB           | 5.9 KB            | −38 %  |
| Server HTML, gzip, 404 page               | 7.1 KB           | 3.0 KB            | −57 %  |
| CSS rules in the server HTML, home page   | 365              | 192               | −47 %  |
| CSS rules in the server HTML, showcase    | 365              | 155               | −58 %  |
| `style` attributes, home page             | 220              | 1                 |        |
| `<img>` elements in the server HTML, home | 0                | 8                 |        |

react-native-web renders an image as a CSS background after the JavaScript runs. `@rootnative/web` renders an `<img>` in the server HTML.

### Load and interaction

Four groups: the home page and the showcase page, at 390 × 844 and at 1280 × 800. Each run loads the page, then scrolls to the end in 30 wheel steps.

| Measure                           | Change                                               | Result                                              |
| --------------------------------- | ---------------------------------------------------- | --------------------------------------------------- |
| DOMContentLoaded                  | −5 to −13 %                                          | Better in 4 groups                                  |
| Script time at load               | −8 to −16 %                                          | Better in 3 groups, no clear change in 1            |
| All main-thread work at load      | −3 to −12 %                                          | Better in 3 groups, no clear change in 1            |
| Style recalculation at load       | −6 to −17 %                                          | Better in 1 group, no clear change in 3             |
| LCP                               | −7 to −14 % in 3 groups, +7 % on the phone home page | Better in 1 group, worse in 1, no clear change in 2 |
| Script time in the scroll         | −15 to −21 %                                         | Better in 4 groups                                  |
| Worst frame in the scroll         | 83 → 67 ms on the phone home page                    | Better in 1 group, no clear change in 3             |
| FCP                               | 192 → 206 ms (+7 %) on the phone home page           | Worse in 1 group, no clear change in 3              |
| Layout at load                    | 111 → 119 ms (+7 %) on the phone home page           | Worse in 1 group, no clear change in 3              |
| Style recalculation in the scroll | 52 → 65 ms (+24 %) on the phone home page            | Worse in 1 group, no clear change in 3              |
| Total Blocking Time, CLS          |                                                      | No clear change                                     |

On the phone home page, the largest element is the heading, so LCP is the same as FCP there.

The JavaScript heap right after the load is 15 % lower on the showcase page, and 8–11 % higher on the home page. That number depends on when the garbage collector runs. After a forced garbage collection, `@rootnative/web` uses about 5–8 % less on each page, and neither runtime grows over 45 idle seconds.

### Lighthouse

Medians of 5 runs, react-native-web → `@rootnative/web`:

| Measure             | Mobile, home     | Mobile, showcase   | Desktop, home    | Desktop, showcase |
| ------------------- | ---------------- | ------------------ | ---------------- | ----------------- |
| Performance score   | 74 → 82          | 49 → 46            | 63 → 75          | 67 → 70           |
| Accessibility score | 100 → 100        | 96 → 100           | 100 → 100        | 96 → 100          |
| Total Blocking Time | 1,342 → 647 ms   | 1,171 → 841 ms     | 346 → 182 ms     | 170 → 139 ms      |
| Speed Index         | 2,876 → 2,584 ms | 2,355 → 1,414 ms   | 832 → 728 ms     | 536 → 355 ms      |
| FCP                 | 1,429 → 1,448 ms | 1,368 → 1,414 ms   | 340 → 356 ms     | 338 → 346 ms      |
| Time to Interactive | 7,403 → 8,030 ms | 13,632 → 13,894 ms | 2,117 → 2,081 ms | 2,728 → 2,688 ms  |

Over the 20 pairs of runs:

- Total Blocking Time and the main-thread work are lower in all 20 pairs.
- The performance score is higher in 17 of 19 pairs. On the mobile showcase page, the median is lower, but the runs spread (react-native-web 42–60, `@rootnative/web` 46–53).
- FCP is later in 15 of 20 pairs.
- Time to Interactive is later in 5 of 5 pairs on the mobile home page, with no clear change in the other groups. The probable cause: the 8 images of the server HTML (160 KB) share the simulated slow network with the JavaScript.
- The accessibility score of the showcase page is 100 on `@rootnative/web`. react-native-web renders an image that fails to load as a `<div aria-label>` with no role, and the audit flags it.

## Dashboard

One page with a table, a menu, and a dialog. The page renders in the browser, with no server HTML. An open time runs from the input event to the first frame with the menu or the dialog.

| Measure                              | react-native-web | `@rootnative/web` | Change |
| ------------------------------------ | ---------------- | ----------------- | ------ |
| JavaScript, gzip                     | 402 KB           | 387 KB            | −3.7 % |
| CSS rules after the load             | 338              | 281               | −17 %  |
| FCP                                  | 960 ms           | 868 ms            | −10 %  |
| LCP                                  | 1,624 ms         | 1,440 ms          | −11 %  |
| Total Blocking Time                  | 294 ms           | 226 ms            | −23 %  |
| Script time to a settled load        | 1,416 ms         | 1,221 ms          | −14 %  |
| Layout time at load                  | 89 ms            | 91 ms             | +2 %   |
| Style recalculation at load          | 32 ms            | 33 ms             | +3 %   |
| Menu, open                           | 74 ms            | 56 ms             | −24 %  |
| Dialog, open                         | 255 ms           | 189 ms            | −26 %  |
| Longest frame as the dialog opens    | 233 ms           | 183 ms            | −21 %  |
| JavaScript heap after the load       | 10.76 MB         | 10.20 MB          | −5 %   |
| JavaScript heap after 20 menu cycles | 13.04 MB         | 12.22 MB          | −6 %   |

To close the menu or the dialog takes about the same time on both runtimes (+2 % and −5 %). The exit animation of the component library sets that time.

## Component gallery

Seven pages of the gallery, at 1280 × 800. Each page gets one interaction after the load. The worse results of this app also showed in a second set of 10 runs.

### Size

| Measure                           | react-native-web | `@rootnative/web` | Change       |
| --------------------------------- | ---------------- | ----------------- | ------------ |
| JavaScript, gzip                  | 712 KB           | 698 KB            | −2 %         |
| Server HTML of the 48 pages, gzip | 538 KB           | 306 KB            | −43 %        |
| `style` attributes, home page     | 525              | 18                | −97 %        |
| CSS rules after the load, 7 pages |                  |                   | −23 to −58 % |

### Load

| Page       | Script time | All main-thread work | Style recalculation | Total Blocking Time | FCP   |
| ---------- | ----------- | -------------------- | ------------------- | ------------------- | ----- |
| Home       | −20 %       | −20 %                | −35 %               | −19 %               | +3 %  |
| Button     | −15 %       | −15 %                | −67 %               | −4 %                | −3 %  |
| List       | −11 %       | −13 %                | −60 %               | −2 %                | −1 %  |
| Text field | −13 %       | −11 %                | +74 %               | −2 %                | −4 %  |
| Tabs       | −16 %       | −14 %                | −43 %               | −4 %                | −1 %  |
| Menu       | −9 %        | −11 %                | −62 %               | +1 %                | −10 % |
| Carousel   | −12 %       | −11 %                | −11 %               | −1 %                | −3 %  |

### Interactions

| Page       | Interaction              | Script time              | Style recalculation | Longest input event |
| ---------- | ------------------------ | ------------------------ | ------------------- | ------------------- |
| Home       | Scroll, 30 wheel steps   | 63 → 57 ms (−9 %)        | 9.6 → 9.2 ms        | 20 → 24 ms          |
| Button     | 12 presses, 120 ms apart | 455 → 453 ms             | 72 → 111 ms (+54 %) | 216 → 160 ms        |
| List       | Scroll, 30 wheel steps   | 28 → 21 ms (−25 %)       | 0 → 0 ms            | 80 → 88 ms          |
| Text field | Type 33 characters       | 1,773 → 1,036 ms (−42 %) | 2.3 → 3.1 ms        | 88 → 64 ms          |
| Tabs       | Select up to 8 tabs      | 366 → 332 ms (−9 %)      | 37 → 34 ms          | 168 → 160 ms        |
| Menu       | Open and close, 5 times  | 533 → 483 ms (−9 %)      | 55 → 105 ms (+90 %) | 176 → 172 ms        |
| Carousel   | Scroll, 30 wheel steps   | 39 → 31 ms (−20 %)       | 0 → 0 ms            | 16 → 16 ms          |

## Measure your own app

1. Export your app two times from one commit: one with react-native-web, one with `@rootnative/web`.
2. Serve both exports from a local server.
3. Load them in turns in the same browser, with the cache off and a CPU throttle.
4. Take 10 runs or more of each runtime.
5. Compare the medians, and count how often each runtime wins a pair of runs.
