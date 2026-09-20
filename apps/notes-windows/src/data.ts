// 50 generated, realistic-looking notes, ported verbatim from the notes-jsx
// reference so the list content (headings, dates, previews, bodies, folders)
// matches it exactly. Entirely synthetic — no personal data. The note-title
// field is `heading` (not `title`) because `title` collides with a native
// ObjC property name in the apple-native compile path.
export interface Note {
  id: string
  folder: string
  heading: string
  date: string
  preview: string
  body: string
}

export const folders: { name: string; symbol: string }[] = [
  { name: 'All Notes', symbol: 'tray.full' },
  { name: 'Personal', symbol: 'folder' },
  { name: 'Work', symbol: 'folder' },
  { name: 'Ideas', symbol: 'lightbulb' },
  { name: 'Travel', symbol: 'airplane' },
  { name: 'Archive', symbol: 'archivebox' },
]

export const notes: Note[] = [
  { id: "n1", folder: "Work", heading: "Q3 planning kickoff", date: "Today", preview: "Themes: reliability, onboarding, billing", body: "Themes: reliability, onboarding, billing.\nStaff two new hires to the platform pod.\nDraft OKRs by Friday and circulate for feedback." },
  { id: "n2", folder: "Work", heading: "Standup — Tuesday", date: "Today", preview: "Shipped the search reindex", body: "Shipped the search reindex.\nBlocked on the staging cert renewal.\nPairing with Dana on the export bug this afternoon." },
  { id: "n3", folder: "Personal", heading: "Grocery list", date: "Yesterday", preview: "Oat milk, spinach, lemons", body: "Oat milk\nSpinach\nLemons\nChickpeas\nSourdough\nGreek yogurt\nDark chocolate" },
  { id: "n4", folder: "Ideas", heading: "Side project: habit tracker", date: "Yesterday", preview: "Tiny daily check-ins, no streaks", body: "Tiny daily check-ins, no streaks pressure.\nLocal-first, syncs over the cloud.\nWidget that shows the last 7 days." },
  { id: "n5", folder: "Travel", heading: "Lisbon trip checklist", date: "Yesterday", preview: "Book Alfama walking tour", body: "Book Alfama walking tour\nPasteis de Belem early to skip the line\nDay trip to Sintra\nReserve the rooftop dinner for Saturday" },
  { id: "n6", folder: "Work", heading: "Postmortem: payment timeouts", date: "Mon", preview: "Root cause: connection pool exhaustion", body: "Root cause: connection pool exhaustion under retry storm.\nFix: cap retries, add jittered backoff.\nFollow-up: dashboard alert on pool saturation." },
  { id: "n7", folder: "Personal", heading: "Marathon training — week 6", date: "Mon", preview: "Tempo, intervals, long run", body: "Mon rest\nTue 8km tempo\nWed 5km easy\nThu intervals 6x800\nSat long run 24km" },
  { id: "n8", folder: "Ideas", heading: "Blog post outline", date: "Mon", preview: "Boring tech wins", body: "Title: Boring tech wins\n- Pick tools you can debug at 3am\n- Optimize for deletion\n- The cost of cleverness" },
  { id: "n9", folder: "Work", heading: "Hiring loop feedback", date: "Sun", preview: "Strong systems design", body: "Strong systems design, clear communication.\nWould pair well with the infra team.\nRecommend moving to offer." },
  { id: "n10", folder: "Personal", heading: "Books to read", date: "Sun", preview: "The Left Hand of Darkness", body: "The Left Hand of Darkness\nThinking in Systems\nThe Goal\nProject Hail Mary (reread)" },
  { id: "n11", folder: "Travel", heading: "Packing list — carry-on", date: "Sun", preview: "Merino tee x3, packing cubes", body: "Merino tee x3\nPacking cubes\nUniversal adapter\nKindle\nReusable bottle" },
  { id: "n12", folder: "Ideas", heading: "App: split the bill", date: "Fri", preview: "Scan receipt, tap items", body: "Scan receipt, tap items, assign to people.\nSettle up via a shareable link.\nNo account required." },
  { id: "n13", folder: "Work", heading: "Architecture review notes", date: "Fri", preview: "Move the queue consumer off the API box", body: "Move the queue consumer off the API box.\nIntroduce an outbox table for events.\nMeasure tail latency before/after." },
  { id: "n14", folder: "Personal", heading: "Apartment hunting", date: "Fri", preview: "Budget ceiling set", body: "Budget ceiling set.\nMust-haves: light, laundry, 30min commute.\nViewings booked for Saturday morning." },
  { id: "n15", folder: "Ideas", heading: "Garden plan for spring", date: "Thu", preview: "Tomatoes, basil, chili", body: "Tomatoes, basil, chili on the balcony.\nStart seeds indoors mid-March.\nSelf-watering pots this year." },
  { id: "n16", folder: "Work", heading: "Customer call — Northwind", date: "Thu", preview: "They want SSO and audit logs", body: "They want SSO and audit logs.\nConcerned about export performance.\nSend the roadmap one-pager." },
  { id: "n17", folder: "Personal", heading: "Weekend plans", date: "Thu", preview: "Farmers market Saturday", body: "Farmers market Saturday\nFix the squeaky door\nMovie night: a noir pick" },
  { id: "n18", folder: "Ideas", heading: "Talk proposal", date: "Wed", preview: "Designing for the offline path", body: "Designing for the offline path.\nReal failures from the field.\n25 min + Q&A." },
  { id: "n19", folder: "Travel", heading: "Kyoto itinerary", date: "Wed", preview: "Fushimi Inari at sunrise", body: "Fushimi Inari at sunrise\nArashiyama bamboo grove\nNishiki market lunch\nGion stroll at dusk" },
  { id: "n20", folder: "Work", heading: "Sprint retro actions", date: "Wed", preview: "Smaller PRs, faster reviews", body: "Smaller PRs, faster reviews.\nRotate the on-call handoff doc.\nAdd flaky-test quarantine." },
  { id: "n21", folder: "Personal", heading: "Recipe: lemon pasta", date: "Tue", preview: "Spaghetti, lemon, parmesan", body: "Spaghetti, lemon zest + juice, parmesan, butter, black pepper.\nReserve pasta water.\nFinish with basil." },
  { id: "n22", folder: "Ideas", heading: "Newsletter topics", date: "Tue", preview: "Caching pitfalls", body: "Caching pitfalls\nWriting runbooks people read\nThe underrated SELECT\nWhen to delete a service" },
  { id: "n23", folder: "Work", heading: "Roadmap themes", date: "Tue", preview: "Trust, time-to-value, scale", body: "Trust (security, reliability)\nTime-to-value (onboarding)\nScale (multi-region)" },
  { id: "n24", folder: "Personal", heading: "Gift ideas", date: "Mon", preview: "Ceramics class, headphones", body: "Ceramics class\nNoise-cancelling headphones\nA good olive oil set" },
  { id: "n25", folder: "Ideas", heading: "Logo sketches", date: "5/20/26", preview: "Monogram with a soft notch", body: "Monogram with a soft notch.\nTry a single-weight geometric sans.\nWarm paper background." },
  { id: "n26", folder: "Work", heading: "Incident runbook draft", date: "5/19/26", preview: "Acknowledge, assign IC, mitigate", body: "1. Acknowledge + open channel\n2. Assign IC\n3. Mitigate before diagnosing\n4. Comms every 30 min" },
  { id: "n27", folder: "Travel", heading: "Road trip stops", date: "5/18/26", preview: "Big Sur overlook", body: "Big Sur overlook\nMcWay Falls\nElephant seal beach\nPie stop in Cambria" },
  { id: "n28", folder: "Personal", heading: "Errands + admin", date: "5/18/26", preview: "Book cleaning, renew passport", body: "Book a cleaning\nRenew passport\nReturn the library books\nCancel the unused subscription" },
  { id: "n29", folder: "Ideas", heading: "Feature: smart folders", date: "5/17/26", preview: "Rules: tag, date, attachment", body: "Rules: tag, date, has-attachment.\nLive-updating counts.\nPin favorites to the top." },
  { id: "n30", folder: "Work", heading: "Vendor comparison", date: "5/17/26", preview: "Two finalists", body: "Two finalists.\nA: cheaper, weaker SLA.\nB: pricier, better support + audit.\nLean B for compliance." },
  { id: "n31", folder: "Personal", heading: "Workout split", date: "5/16/26", preview: "Push / Pull / Legs", body: "Push / Pull / Legs\nThree rounds a week.\nDeload every fourth week." },
  { id: "n32", folder: "Ideas", heading: "Podcast episode list", date: "5/16/26", preview: "On-call culture", body: "On-call culture\nThe boring-tech manifesto\nWriting for engineers" },
  { id: "n33", folder: "Travel", heading: "Visa + docs", date: "5/15/26", preview: "Passport valid 6+ months", body: "Passport valid 6+ months\nTravel insurance printout\nHotel confirmations\nOffline maps downloaded" },
  { id: "n34", folder: "Work", heading: "Migration plan", date: "5/15/26", preview: "Dual-write phase", body: "Dual-write phase\nBackfill in batches\nShadow reads to verify\nCutover on a quiet weekend" },
  { id: "n35", folder: "Personal", heading: "Movie watchlist", date: "5/14/26", preview: "Past Lives, The Conversation", body: "Past Lives\nThe Conversation\nDrive My Car\nPerfect Days" },
  { id: "n36", folder: "Ideas", heading: "Pricing experiment", date: "5/14/26", preview: "Add an annual plan", body: "Add an annual plan.\nHighlight the savings, not the discount.\nMeasure trial-to-paid lift." },
  { id: "n37", folder: "Work", heading: "1:1 prep — manager", date: "5/13/26", preview: "Career, scope, feedback", body: "Career: more systems work.\nScope: own the export pipeline.\nFeedback: faster decisions." },
  { id: "n38", folder: "Personal", heading: "Home maintenance", date: "5/13/26", preview: "Replace the HVAC filter", body: "Replace the HVAC filter\nDescale the kettle\nTighten the cabinet hinge\nTest smoke detectors" },
  { id: "n39", folder: "Ideas", heading: "Onboarding redesign", date: "5/12/26", preview: "First win in under five minutes", body: "First win in under five minutes.\nSample data preloaded.\nProgress checklist that celebrates." },
  { id: "n40", folder: "Travel", heading: "Hiking gear", date: "5/12/26", preview: "Trail runners, rain shell", body: "Trail runners\nLight rain shell\n2L water\nSnacks + electrolytes\nHeadlamp" },
  { id: "n41", folder: "Work", heading: "API deprecation notice", date: "5/11/26", preview: "v1 sunset in 90 days", body: "v1 sunset in 90 days.\nMigration guide + codemod.\nEmail the top 20 integrators." },
  { id: "n42", folder: "Personal", heading: "Plant watering schedule", date: "5/11/26", preview: "Monstera weekly", body: "Monstera: weekly\nSnake plant: every 2-3 weeks\nFern: keep moist\nRotate toward the light." },
  { id: "n43", folder: "Ideas", heading: "Talk title ideas", date: "5/10/26", preview: "The cost of cleverness", body: "The cost of cleverness\nOperating the boring stack\nDelete more code" },
  { id: "n44", folder: "Work", heading: "Security checklist", date: "5/10/26", preview: "Rotate keys quarterly", body: "Rotate keys quarterly\nLeast-privilege IAM\nMFA everywhere\nReview third-party scopes" },
  { id: "n45", folder: "Personal", heading: "Birthday plan", date: "5/9/26", preview: "Dinner reservation for 8", body: "Dinner reservation for 8.\nOrder the almond cake.\nPlaylist + candles." },
  { id: "n46", folder: "Ideas", heading: "Shortcuts to add", date: "5/9/26", preview: "Quick switcher", body: "Quick switcher\nNew note from anywhere\nPin/unpin\nJump to folder" },
  { id: "n47", folder: "Travel", heading: "Restaurants to try", date: "5/8/26", preview: "The corner trattoria", body: "The corner trattoria\nRamen near the station\nNatural wine bar\nBakery with cardamom buns" },
  { id: "n48", folder: "Work", heading: "Load test results", date: "5/8/26", preview: "p50 stable to 5k rps", body: "p50 stable to 5k rps.\np99 climbs past 8k rps.\nNext: profile the serializer." },
  { id: "n49", folder: "Personal", heading: "Journaling prompts", date: "5/7/26", preview: "What went well this week?", body: "What went well this week?\nWhat drained me?\nOne thing to try next week." },
  { id: "n50", folder: "Archive", heading: "Receipts 2025", date: "3/28/26", preview: "Scanned receipts for taxes", body: "Archived: scanned receipts for taxes.\n12 attachments." },
]
