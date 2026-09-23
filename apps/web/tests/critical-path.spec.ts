import { expect, test } from "@playwright/test";

test("fresh user can reach the sparse recommendation screen", async ({ page }) => {
  await page.route("**/v1/households", async (route) => {
    await route.fulfill({
      json: {
        id: "hh-e2e",
        household_size: 4,
        diet_type: "veg",
        preferred_styles: ["dosa", "idli"],
        avoid_ingredients: [],
        time_band: "under_20"
      }
    });
  });
  await page.route("**/v1/recommendations", async (route) => {
    await route.fulfill({
      json: {
        recommendation_id: "rec-e2e",
        session_id: "session-e2e",
        score: 91,
        reason_codes: ["pantry_match", "good_rotation"],
        reason: "You have the main ingredients and have not had this too recently.",
        dish: {
          id: "dish-011",
          meal_type: "breakfast",
          slug: "plain-dosa",
          name: "Plain Dosa",
          region: ["pan-South"],
          diet_type: "veg",
          category: "dosa",
          active_time_minutes: 18,
          total_time_minutes: 25,
          morning_effort_minutes: 18,
          requires_previous_night_prep: true,
          ingredients_required: ["rice", "urad dal"],
          ingredients_optional: ["chutney"],
          side_suggestions: ["coconut chutney", "sambar"],
          repeat_gap_days: 4,
          steps: ["Heat the tawa.", "Spread the batter.", "Cook until crisp."]
        }
      }
    });
  });
  await page.goto("/");
  await expect(page.getByText("Naale enu?")).toBeVisible();
  await page.getByText("Naale enu?").click();
  await page.getByRole("button", { name: "Start gently" }).click();
  await page.getByRole("button", { name: "Done" }).click();
  await expect(page.getByRole("button", { name: "Cook this" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Another" })).toBeVisible();
});
