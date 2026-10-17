from scripts.import_nco_2015 import (
    is_terminal_empty_page,
    merge_and_validate,
    parse_nco_page,
)


FIXTURE = """
<table>
  <tr>
    <th>S.No.</th><th>Occupational Title</th><th>NCO 2015</th><th>NCO 2004</th>
    <th>Division</th><th>Sub Division</th><th>Group</th><th>Family</th>
  </tr>
  <tr><td>1</td><td>Electrician, General</td><td>7411.0100</td><td>7137.10</td>
    <td>Craft and Related Trades Workers</td><td>Electrical and Electronics Trades Workers</td>
    <td>Electrical Equipment Installers and Repairers</td><td>Building and Related Electricians</td></tr>
  <tr><td>2</td><td>Computer Programmer/Software Engineer</td><td>2512.0100</td><td></td>
    <td>Professionals</td><td>Information and Communication Technology Professionals</td>
    <td>Software and Application Developers, and Analysts</td><td>Software Developers</td></tr>
</table>
"""


def test_parse_nco_table_and_preserve_hierarchy():
    rows = parse_nco_page(FIXTURE, 0, "https://www.dge.gov.in/nat?page=0")
    assert len(rows) == 2
    assert rows[0]["nco_code"] == "7411.0100"
    assert rows[0]["occupation_title"] == "Electrician, General"
    assert rows[0]["occupation_family"] == "Building and Related Electricians"
    assert rows[1]["nco_2004_code"] is None


def test_duplicate_identical_code_is_deduplicated():
    rows = parse_nco_page(FIXTURE, 0, "https://www.dge.gov.in/nat?page=0")
    assert len(merge_and_validate(rows + rows)) == 2


def test_conflicting_duplicate_code_fails_closed():
    rows = parse_nco_page(FIXTURE, 0, "https://www.dge.gov.in/nat?page=0")
    conflict = dict(rows[0], occupation_title="Incorrect title")
    try:
        merge_and_validate(rows + [conflict])
        assert False, "expected conflicting duplicate to raise"
    except ValueError as exc:
        assert "Conflicting catalogue rows" in str(exc)


def test_header_parser_tolerates_minor_dge_label_changes():
    variant = (
        FIXTURE.replace("Occupational Title", "Occupation Title")
        .replace("NCO 2015</th>", "NCO 2015 Code</th>")
        .replace("<th>Group</th>", "<th>Occupation Group</th>")
    )
    rows = parse_nco_page(variant, 0, "https://dge.gov.in/nat")
    assert len(rows) == 2
    assert rows[0]["nco_code"] == "7411.0100"
    assert rows[0]["occupation_group"] == "Electrical Equipment Installers and Repairers"


def test_unrecognized_page_reports_observed_structure_without_db_side_effects():
    try:
        parse_nco_page("<html><title>Access check</title><body>Please verify</body></html>", 0, "https://dge.gov.in/nat")
        assert False, "expected header discovery to fail"
    except ValueError as exc:
        assert "Parsed 0 HTML table row(s)" in str(exc)
        assert "No database changes were made" in str(exc)



def test_out_of_range_official_dge_pager_page_is_terminal():
    html = """
    <html><body>
      Directorate General of Employment
      National Classification of Occupations
      <a href="/nat?page=0">1</a>
      <a href="/nat?page=1">2</a>
      <a href="/nat?page=6">7</a>
    </body></html>
    """
    assert is_terminal_empty_page(html, 7)
    assert not is_terminal_empty_page(html, 6)


def test_midrun_missing_table_is_not_mistaken_for_end_of_data():
    html = """
    <html><body>
      Directorate General of Employment
      National Classification of Occupations
      <a href="/nat?page=0">1</a>
      <a href="/nat?page=6">7</a>
    </body></html>
    """
    assert not is_terminal_empty_page(html, 3)


def test_empty_non_dge_response_is_not_treated_as_terminal_page():
    html = '<html><body>Access denied <a href="/?page=7">next</a></body></html>'
    assert not is_terminal_empty_page(html, 8)


def test_page_with_table_rows_is_not_treated_as_empty_terminal_page():
    html = """
    <html><body>
      Directorate General of Employment
      National Classification of Occupations
      <a href="/nat?page=6">7</a>
      <table><tr><td>occupation row</td></tr></table>
    </body></html>
    """
    assert not is_terminal_empty_page(html, 7)



def test_empty_final_page_uses_last_verified_pager_bound_when_it_has_no_pager_links():
    html = """
    <html><body>
      Directorate General of Employment
      National Classification of Occupations
      <!-- empty out-of-range page has no result table and no pager controls -->
    </body></html>
    """
    assert is_terminal_empty_page(html, 7, last_known_page=6)
    assert not is_terminal_empty_page(html, 6, last_known_page=6)
