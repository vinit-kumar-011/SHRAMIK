import unittest

from scripts.audit_ncs_vacancy_reports import HTMLInventoryParser, SOURCES


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


if __name__ == "__main__":
    unittest.main()
