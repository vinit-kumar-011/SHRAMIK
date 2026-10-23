import unittest

from scripts.audit_ncs_vacancy_reports import (
    HTMLInventoryParser,
    SOURCES,
    extract_dashboard_datasets,
    extract_static_route_candidates,
    extract_embedded_dashboard_series,
    find_dashboard_keyword_contexts,
    _redact_static_text,
)


class NCSHTMLInventoryTests(unittest.TestCase):
    def test_known_source_urls_are_official_and_scope_is_limited(self):
        self.assertIn("www.ncs.gov.in", SOURCES["bihar_sample_report_legacy_url"])
        self.assertIn("2024-25", SOURCES["bihar_sample_report_legacy_url"])
        self.assertIn("ncs.gov.in/NCSReportDashboard", SOURCES["current_ncs_report_dashboard"])
        self.assertNotIn("Search.aspx", SOURCES["bihar_sample_report_legacy_url"])

    def test_parser_extracts_title_tables_and_links(self):
        source = """
        <html><head><title>NCS vacancy report</title></head><body>
          <a href="/District.html">District report</a>
          <table><tr><th>District</th><th>Vacancies</th></tr>
          <tr><td>Khordha</td><td>120</td></tr></table>
        </body></html>
        """
        parser = HTMLInventoryParser()
        parser.feed(source)
        self.assertEqual(parser.title.strip(), "NCS vacancy report")
        self.assertEqual(parser.tables, [[["District", "Vacancies"], ["Khordha", "120"]]])
        self.assertEqual(parser.links[0]["href"], "/District.html")
        self.assertEqual(parser.links[0]["text"], "District report")


    def test_dashboard_registration_table_exports_only_with_matching_headline_total(self):
        source = {
            "final_url": "https://ncs.gov.in/NCSReportDashboard",
            "visible_text_excerpt": (
                "NCS Dashboard Report Last Updated on 15th July, 2026 Jobseeker Details "
                "Jobseeker Registered 1,000 Active Jobseekers 500 Vacancy Details "
                "Vacancies 3,000 Employers Active Employers 100 Last updated: 28-09-26"
            ),
            "table_previews": [{
                "rows": [
                    ["STATE", "2015-16", "2016-17", "2017-18", "2018-19", "2019-20", "GRAND TOTAL"],
                    ["Alpha State", "100", "50", "25", "25", "50", "1,000"],
                    ["State Not Specified", "0", "0", "0", "0", "0", "0"],
                    ["Grand Total", "100", "50", "25", "25", "50", "1,000"],
                ]
            }]
        }
        state_rows, metrics, summary = extract_dashboard_datasets(
            source, "2026-10-23T00:00:00+00:00"
        )
        self.assertEqual(summary["state_rows_excluding_unspecified_and_total"], 1)
        self.assertTrue(summary["table_grand_total_matches_jobseeker_registered_headline"])
        self.assertEqual(state_rows[0]["record_type"], "STATE_UT")
        self.assertEqual(state_rows[0]["fy_2015_16_registered"], 100)
        self.assertEqual(state_rows[-1]["record_type"], "TOTAL")
        self.assertEqual(metrics[0]["metric_code"], "NCS_DASHBOARD_JOBSEEKERS_REGISTERED")
        self.assertEqual(summary["freshness_status"], "CONFLICTING_PAGE_UPDATE_LABELS_REVIEW")

    def test_dashboard_registration_table_does_not_pass_if_total_mismatches(self):
        source = {
            "final_url": "https://ncs.gov.in/NCSReportDashboard",
            "visible_text_excerpt": "Jobseeker Registered 1,001",
            "table_previews": [{
                "rows": [
                    ["STATE", "2015-16", "2016-17", "2017-18", "2018-19", "2019-20", "GRAND TOTAL"],
                    ["Alpha State", "100", "50", "25", "25", "50", "1,000"],
                    ["Grand Total", "100", "50", "25", "25", "50", "1,000"],
                ]
            }]
        }
        _, _, summary = extract_dashboard_datasets(source, "2026-10-23T00:00:00+00:00")
        self.assertFalse(summary["table_grand_total_matches_jobseeker_registered_headline"])
        self.assertIn("acceptance_note", summary)


    def test_static_js_route_inventory_finds_api_and_report_strings(self):
        js = (
            'const a="/api/report/vacancies";'
            'const b="https://api.example.test/v1/aggregate";'
            'const c="/_layouts/15/ncsp/ViewStaticReport.aspx";'
        )
        routes = extract_static_route_candidates(js)
        values = {item["route"] for item in routes}
        self.assertIn("/api/report/vacancies", values)
        self.assertIn("https://api.example.test/v1/aggregate", values)
        self.assertTrue(any("ViewStaticReport.aspx" in value for value in values))


    def test_dashboard_keyword_context_inventory_captures_kpi_and_api_configuration(self):
        js = 'const apiUrl="https://ncs.gov.in/api/"; const dashboard="NCSReportDashboard"; const kpi="Vacancies";'
        contexts = find_dashboard_keyword_contexts(js)
        keywords = {item["keyword"] for item in contexts}
        self.assertIn("apiUrl", keywords)
        self.assertIn("NCSReportDashboard", keywords)
        self.assertIn("Vacancies", keywords)


    def test_extracts_full_embedded_dashboard_series_only_when_all_totals_reconcile(self):
        import json
        columns = [
            "2015-16", "2016-17", "2017-18", "2018-19", "2019-20", "2020-21",
            "2021-22", "2022-23", "2023-24", "2024-25", "2025-26", "2026-2027",
        ]
        tab_names = ["Jobseeker Registered", "Active Jobseekers", "Vacancies", "Active Employer"]
        states = [{"state": f"State {i}", "values": [1] * 12, "total": 12} for i in range(36)]
        states.append({"state": "State Not Specified", "values": [2] * 12, "total": 24})
        total = {"label": "Grand Total", "values": [38] * 12, "total": 456}
        tabs = {name: {"rows": states, "grandTotal": total} for name in tab_names}
        js = (
            "this.allColumns=" + json.dumps(columns) + ",this.columnBatches=[];"
            "this.allTabData=" + json.dumps(tabs) + ',this.searchQuery=""'
        )
        dashboard = {
            "final_url": "https://ncs.gov.in/NCSReportDashboard",
            "visible_text_excerpt": (
                "NCS Dashboard Report Last Updated on 15th July, 2026 "
                "Jobseeker Registered 456 Active Jobseekers 456 "
                "Vacancy Details Vacancies 456 Active Employers 456 Last updated: 28-09-26"
            ),
        }
        result = extract_embedded_dashboard_series(
            js, dashboard, "2026-10-23T05:00:00+00:00",
            asset_url="https://ncs.gov.in/main-TEST.js",
            asset_sha256="a" * 64,
        )
        self.assertEqual(result["summary"]["extraction_status"], "PASS_CONTEXT_ONLY_FRESHNESS_REVIEW")
        self.assertEqual(result["summary"]["state_ut_count"], 36)
        self.assertEqual(result["summary"]["row_count"], 1824)
        self.assertTrue(result["summary"]["per_row_totals_valid"])
        self.assertTrue(result["summary"]["per_period_grand_totals_valid"])
        self.assertTrue(result["summary"]["headline_totals_match"])
        self.assertTrue(all(row["freshness_status"] == "CONFLICTING_PAGE_UPDATE_LABELS_REVIEW" for row in result["rows"]))
        self.assertTrue(any(row["period_status"] == "CURRENT_FISCAL_YEAR_IN_PROGRESS_AS_OF_CAPTURE" for row in result["rows"]))

    def test_embedded_series_rejects_inconsistent_period_total(self):
        import json
        columns = [
            "2015-16", "2016-17", "2017-18", "2018-19", "2019-20", "2020-21",
            "2021-22", "2022-23", "2023-24", "2024-25", "2025-26", "2026-2027",
        ]
        tab_names = ["Jobseeker Registered", "Active Jobseekers", "Vacancies", "Active Employer"]
        states = [{"state": f"State {i}", "values": [1] * 12, "total": 12} for i in range(36)]
        states.append({"state": "State Not Specified", "values": [2] * 12, "total": 24})
        total = {"label": "Grand Total", "values": [38] * 12, "total": 456}
        total["values"][0] = 999
        tabs = {name: {"rows": states, "grandTotal": total} for name in tab_names}
        js = "this.allColumns=" + json.dumps(columns) + ",this.columnBatches=[];this.allTabData=" + json.dumps(tabs) + ',this.searchQuery=""'
        dashboard = {
            "final_url": "https://ncs.gov.in/NCSReportDashboard",
            "visible_text_excerpt": "Jobseeker Registered 456 Active Jobseekers 456 Vacancies 456 Active Employers 456",
        }
        result = extract_embedded_dashboard_series(
            js, dashboard, "2026-10-23T05:00:00+00:00",
            asset_url="https://ncs.gov.in/main-TEST.js",
            asset_sha256="a" * 64,
        )
        self.assertEqual(result["summary"]["extraction_status"], "REJECTED")
        self.assertEqual(result["rows"], [])
        self.assertTrue(any("state rows do not sum to grand total" in error for error in result["summary"]["errors"]))

    def test_static_context_redacts_signed_query_values(self):
        text = "download https://ncsdocsstorage.blob.core.windows.net/file.pdf?sv=2023&sig=secretvalue plus accessToken=abc123"
        redacted = _redact_static_text(text)
        self.assertNotIn("secretvalue", redacted)
        self.assertNotIn("abc123", redacted)
        self.assertIn("[QUERY REDACTED]", redacted)


if __name__ == "__main__":
    unittest.main()
