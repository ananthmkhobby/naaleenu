# Content Quality Workflow

The app now supports the production mechanics for persistence, sync, analytics and custom photos. The seed catalog still needs a food-editor pass before a broad public launch.

## Required review fields

For every seeded dish, review:

- Display name and regional naming.
- Ingredients.
- Recipe steps.
- Side dishes.
- Active time and total time.
- Lunchbox suitability.
- Leftover compatibility.
- Kids suitability.
- Whether the illustrative generated visual is acceptable or should be replaced by a real dish photo.

## Real photo path

The app supports uploaded photos for family/custom recipes through Supabase Storage. For curated seed dishes, production should use the same storage strategy or a simple `photo_url` column in a future `catalog_dishes` table.

## Analytics loop

The app records events such as recommendations shown, favorites added, custom dishes saved, reminders configured and Tomorrow Plans saved. Review these events weekly during beta to learn:

- Which meal mode users open most.
- Which recommendations are rejected repeatedly.
- Which side dishes or lunchbox ideas become favorites.
- Whether Tomorrow Plan confirmation is becoming a daily habit.
