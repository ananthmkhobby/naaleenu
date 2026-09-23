# Recommendation Engine

The engine is intentionally deterministic. It produces one breakfast recommendation, reason codes and a human-readable reason.

## Eligibility

The engine filters inactive dishes, blocked dishes, session exclusions, incompatible diet types, avoided ingredients, time-window misses and repeat-gap misses.

If the pool becomes too small, it relaxes repeat-gap and then time. It does not relax diet or avoided ingredients.

## Scoring

Eligible dishes receive a weighted score:

- Preference fit from selected styles and previous loved dishes.
- Pantry match from required ingredients.
- Time fit relative to the selected morning time band.
- Variety from recent cooked history.
- Historical acceptance from loved feedback.

## Reason codes

The API returns structured reason codes such as `pantry_match`, `quick`, `good_rotation` and `household_loved`. The current API also renders short user-facing copy, but a future localization layer can move this to the client.

## Future AI and voice

AI should enrich catalog metadata, parse natural-language pantry notes or produce voice responses. It should not decide the final dish unless its output is converted into deterministic inputs that the recommendation engine can test.
