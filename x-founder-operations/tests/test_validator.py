"""
Smoke tests for XDataValidator.

Run:  python3 -m pytest tests/ -v
  or: python3 -m unittest discover tests/
"""

import sys
import os
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from scripts.x_data_validator import XDataValidator, generate_execution_plan


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

def _make_timeline(tweets):
    return {"ok": True, "tweets": tweets}

def _make_tweet_stub(tweet_id, author_id="u1", created_at="2026-01-01T00:00:00Z"):
    return {"id": tweet_id, "authorId": author_id, "createdAt": created_at, "text": f"tweet {tweet_id}"}

def _make_detail(tweet_id, likes=10, retweets=2, replies=1, quotes=0, impressions=500,
                 author_id="u1", created_at="2026-01-01T00:00:00Z"):
    return {
        "ok": True,
        "tweet": {
            "id": tweet_id,
            "authorId": author_id,
            "createdAt": created_at,
            "text": f"tweet {tweet_id}",
            "metrics": {
                "likeCount": likes,
                "retweetCount": retweets,
                "replyCount": replies,
                "quoteCount": quotes,
                "impressionCount": impressions,
            },
        },
    }


# ---------------------------------------------------------------------------
# validate_timeline_data
# ---------------------------------------------------------------------------

class TestValidateTimeline(unittest.TestCase):

    def setUp(self):
        self.v = XDataValidator("@test")

    def test_happy_path_returns_tweets(self):
        data = _make_timeline([_make_tweet_stub("t1"), _make_tweet_stub("t2")])
        tweets, checks = self.v.validate_timeline_data(data)
        self.assertIsNotNone(tweets)
        self.assertEqual(len(tweets), 2)
        self.assertTrue(any(c["status"] == "OK" for c in checks))

    def test_none_input_returns_none(self):
        tweets, checks = self.v.validate_timeline_data(None)
        self.assertIsNone(tweets)
        self.assertEqual(checks[0]["severity"], "CRITICAL")

    def test_api_error_returns_none(self):
        tweets, checks = self.v.validate_timeline_data({"ok": False, "error": "rate_limit"})
        self.assertIsNone(tweets)
        self.assertEqual(checks[0]["severity"], "CRITICAL")

    def test_empty_tweet_list_returns_empty(self):
        tweets, checks = self.v.validate_timeline_data({"ok": True, "tweets": []})
        self.assertEqual(tweets, [])
        self.assertEqual(checks[0]["severity"], "WARNING")

    def test_tweet_missing_id_is_skipped(self):
        data = _make_timeline([
            {"text": "no id here"},
            _make_tweet_stub("t2"),
        ])
        tweets, checks = self.v.validate_timeline_data(data)
        self.assertEqual(len(tweets), 1)
        self.assertEqual(tweets[0]["id"], "t2")

    def test_timeline_cache_populated(self):
        data = _make_timeline([_make_tweet_stub("t99")])
        self.v.validate_timeline_data(data)
        self.assertIn("t99", self.v.timeline_cache)

    def test_tweetclaw_export_rows_adapt_to_timeline(self):
        export = {
            "tweets": [
                {
                    "tweet_id": "1870000000000000000",
                    "author_handle": "founder",
                    "createdAt": "2026-06-30T10:00:00Z",
                    "text": "Launch metrics from yesterday",
                    "tweet_url": "https://x.com/founder/status/1870000000000000000",
                },
                {"text": "missing id"},
            ]
        }

        timeline = self.v.adapt_tweetclaw_timeline(export)
        tweets, checks = self.v.validate_timeline_data(timeline)

        self.assertEqual(len(timeline["tweets"]), 1)
        self.assertEqual(len(tweets), 1)
        self.assertEqual(tweets[0]["id"], "1870000000000000000")
        self.assertTrue(any(c["status"] == "OK" for c in checks))
        self.assertEqual(len(self.v.validation_report["warnings"]), 1)

    def test_tweetclaw_integer_ids_adapt_to_timeline(self):
        export = {
            "tweets": [
                {
                    "tweet_id": 1870000000000000000,
                    "author_handle": "founder",
                    "text": "Integer IDs from JSON exports stay usable",
                }
            ]
        }

        timeline = self.v.adapt_tweetclaw_timeline(export)

        self.assertEqual(timeline["tweets"][0]["id"], "1870000000000000000")


# ---------------------------------------------------------------------------
# validate_tweet_details
# ---------------------------------------------------------------------------

class TestValidateTweetDetails(unittest.TestCase):

    def setUp(self):
        self.v = XDataValidator("@test")
        stub = _make_tweet_stub("t1")
        self.v.timeline_cache["t1"] = {
            "text_preview": "tweet t1",
            "createdAt": "2026-01-01T00:00:00Z",
            "authorId": "u1",
        }
        self.stub = stub

    def test_valid_detail_returns_tweet(self):
        detail = _make_detail("t1")
        tweet, checks = self.v.validate_tweet_details(detail, self.stub)
        self.assertIsNotNone(tweet)
        self.assertEqual(tweet["id"], "t1")
        self.assertTrue(any(c["status"] == "OK" for c in checks))

    def test_none_detail_returns_none(self):
        tweet, checks = self.v.validate_tweet_details(None, self.stub)
        self.assertIsNone(tweet)
        self.assertEqual(checks[0]["severity"], "ERROR")

    def test_api_error_returns_none(self):
        tweet, checks = self.v.validate_tweet_details(
            {"ok": False, "error": "not_found"}, self.stub
        )
        self.assertIsNone(tweet)
        self.assertEqual(checks[0]["severity"], "ERROR")

    def test_id_mismatch_returns_none(self):
        detail = _make_detail("t999")  # returns different ID
        tweet, checks = self.v.validate_tweet_details(detail, self.stub)
        self.assertIsNone(tweet)
        self.assertTrue(any(c["severity"] == "CRITICAL" for c in checks))

    def test_likes_exceeding_impressions_flagged(self):
        # likes (1000) > impressions (50) → sanity check should flag anomaly
        detail = _make_detail("t1", likes=1000, impressions=50)
        # The validator still returns the tweet (flags anomaly, doesn't drop it)
        tweet, checks = self.v.validate_tweet_details(detail, self.stub)
        error_steps = [c["step"] for c in checks if c.get("severity") == "ERROR"]
        self.assertIn("sanity_check_likes", error_steps)

    def test_missing_metrics_set_to_null(self):
        # Detail without impressionCount
        detail = {
            "ok": True,
            "tweet": {
                "id": "t1",
                "authorId": "u1",
                "createdAt": "2026-01-01T00:00:00Z",
                "metrics": {"likeCount": 5, "retweetCount": 1, "replyCount": 0, "quoteCount": 0},
            },
        }
        tweet, checks = self.v.validate_tweet_details(detail, self.stub)
        self.assertIsNotNone(tweet)
        self.assertIsNone(tweet["metrics"]["impressionCount"])

    def test_data_quality_score_decremented_on_error(self):
        detail = _make_detail("t999")  # triggers ID mismatch → error
        self.v.validate_tweet_details(detail, self.stub)
        self.assertLess(self.v.validation_report["data_quality_score"], 100)

    def test_tweetclaw_export_row_adapts_to_detail(self):
        row = {
            "tweet_id": "t1",
            "author_handle": "u1",
            "createdAt": "2026-01-01T00:00:00Z",
            "text": "tweet t1",
            "likeCount": "10",
            "retweetCount": 2,
            "replyCount": 1,
            "quoteCount": 0,
            "impressionCount": "500",
        }

        detail = self.v.adapt_tweetclaw_detail(row)
        tweet, checks = self.v.validate_tweet_details(detail, self.stub)

        self.assertIsNotNone(tweet)
        self.assertEqual(tweet["metrics"]["likeCount"], 10)
        self.assertEqual(tweet["metrics"]["quoteCount"], 0)
        self.assertEqual(tweet["metrics"]["impressionCount"], 500)
        self.assertTrue(any(c["status"] == "OK" for c in checks))

    def test_tweetclaw_integer_id_adapts_to_detail(self):
        detail = self.v.adapt_tweetclaw_detail({"tweet_id": 1870000000000000000})

        self.assertTrue(detail["ok"])
        self.assertEqual(detail["tweet"]["id"], "1870000000000000000")

    def test_tweetclaw_invalid_detail_row_is_rejected(self):
        detail = self.v.adapt_tweetclaw_detail(["not", "a", "row"])

        self.assertFalse(detail["ok"])
        self.assertEqual(detail["error"], "invalid_tweetclaw_export_row")


# ---------------------------------------------------------------------------
# calculate_metrics
# ---------------------------------------------------------------------------

class TestCalculateMetrics(unittest.TestCase):

    def setUp(self):
        self.v = XDataValidator("@test")

    def _make_full_tweet(self, tweet_id, likes, retweets, replies, quotes, impressions):
        return {
            "id": tweet_id,
            "metrics": {
                "likeCount": likes,
                "retweetCount": retweets,
                "replyCount": replies,
                "quoteCount": quotes,
                "impressionCount": impressions,
            },
        }

    def test_empty_list_returns_zero(self):
        result = self.v.calculate_metrics([])
        self.assertEqual(result["total_tweets"], 0)

    def test_correct_engagement_rate(self):
        tweets = [self._make_full_tweet("t1", 10, 2, 1, 0, 500)]
        result = self.v.calculate_metrics(tweets)
        # (10+2+1+0) / 500 * 100 = 2.6%
        self.assertAlmostEqual(result["engagement_rate"], 2.6, places=1)

    def test_multiple_tweets_averaged(self):
        tweets = [
            self._make_full_tweet("t1", 10, 0, 0, 0, 500),
            self._make_full_tweet("t2", 20, 0, 0, 0, 1000),
        ]
        result = self.v.calculate_metrics(tweets)
        self.assertEqual(result["total_tweets"], 2)
        self.assertEqual(result["complete_data"], 2)
        self.assertEqual(result["avg_impressions"], 750.0)

    def test_incomplete_tweet_excluded_from_calculation(self):
        tweets = [
            self._make_full_tweet("t1", 10, 0, 0, 0, 500),
            {"id": "t2", "metrics": {"likeCount": 5, "retweetCount": None}},  # incomplete
        ]
        result = self.v.calculate_metrics(tweets)
        self.assertEqual(result["total_tweets"], 2)
        self.assertEqual(result["complete_data"], 1)
        self.assertEqual(result["incomplete_data"], 1)

    def test_zero_impressions_returns_null_rate(self):
        tweets = [self._make_full_tweet("t1", 0, 0, 0, 0, 0)]
        result = self.v.calculate_metrics(tweets)
        self.assertIsNone(result["engagement_rate"])


# ---------------------------------------------------------------------------
# generate_execution_plan
# ---------------------------------------------------------------------------

class TestGenerateExecutionPlan(unittest.TestCase):

    def test_plan_has_required_fields(self):
        plan = generate_execution_plan("@testuser")
        self.assertIn("analysis_id", plan)
        self.assertIn("username", plan)
        self.assertIn("steps", plan)
        self.assertEqual(plan["username"], "@testuser")

    def test_plan_has_six_steps(self):
        plan = generate_execution_plan("@testuser")
        self.assertEqual(len(plan["steps"]), 6)

    def test_step_numbers_sequential(self):
        plan = generate_execution_plan("@testuser")
        steps = [s["step"] for s in plan["steps"]]
        self.assertEqual(steps, list(range(1, 7)))

    def test_validation_principles_present(self):
        plan = generate_execution_plan("@testuser")
        self.assertTrue(len(plan["validation_principles"]) >= 3)


# ---------------------------------------------------------------------------
# finalize_report
# ---------------------------------------------------------------------------

class TestFinalizeReport(unittest.TestCase):

    def test_report_score_bounded(self):
        v = XDataValidator("@test")
        for _ in range(20):
            v._log_error("error", {})
        report = v.finalize_report()
        self.assertGreaterEqual(report["data_quality_score"], 0)

    def test_report_has_summary_counts(self):
        v = XDataValidator("@test")
        v._log_warning("warn", {})
        v._log_error("err", {})
        report = v.finalize_report()
        self.assertEqual(report["total_errors"], 1)
        self.assertEqual(report["total_warnings"], 1)


if __name__ == "__main__":
    unittest.main()
