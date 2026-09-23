# Test Plan

## Automated

- API unit tests cover vegetarian safety, avoided ingredients, session exclusions, quicker recommendations and fallback behavior.
- Web unit tests assert the two-dominant-action home constraint.
- Playwright smoke test covers first setup through the recommendation screen.

## Manual mobile QA

1. Start API and web dev servers.
2. Open the PWA at 390 by 844.
3. Complete setup with minimal input.
4. Skip pantry and verify one recommendation appears.
5. Tap Another and verify the dish changes.
6. Switch to Lunchbox and verify a lunchbox recommendation appears.
7. Tap Cook this or Pack this and verify ingredients plus concise steps.
8. Mark cooked, provide feedback and verify history.
9. Reload and verify household context and history remain.
10. Open Breakfast Book, search for a dish and add one family breakfast or lunchbox item.
11. Use the Family breakfast or Family lunch tab and verify only saved household recipes appear.
12. Add a custom dish photo and verify it appears in the recipe book and cook view.
13. Copy a catalog dish into the family folder, edit its steps and verify the edited copy appears as family/custom.
14. Verify “Best with” side dish suggestions are visible on dashboard and cook view.
15. Verify “Another” does not show the same dish family repeatedly when enough alternatives exist.
16. Open Tomorrow Plan and verify breakfast, lunchbox, dinner rescue, prep and grocery gap sections appear.
17. Open Leftover Magic, select cooked rice or chapati and verify matching ideas appear.
18. Reload and verify the custom family item remains in the correct meal mode.
19. Stop API, mark a meal or feedback and verify the local outbox retains the action.

## Accessibility

- Check keyboard focus order through setup, pantry, decision, cook and feedback screens.
- Verify touch targets remain at least 44 by 44 CSS pixels.
- Verify text contrast against the cream background and green buttons.
- Verify `prefers-reduced-motion` disables nonessential animation.
