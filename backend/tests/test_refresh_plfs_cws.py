from __future__ import annotations

import pytest

from app.ingestion.refresh_plfs_cws import parse_monthly_cws


def fixture_page(
    *,
    lfpr: str = "55.5",
    wpr: str = "52.7",
    ur: str = "5.0",
    period_lfpr: str = "September 2026",
    period_wpr: str = "September 2026",
    period_ur: str = "September 2026",
) -> str:
    return f"""
    <!doctype html><html><body>
      <main>
        <section class="metric">
          <strong>{lfpr}%</strong>
          <h2>Labour Force Participation Rate (LFPR)</h2>
          <p>Labour force participation rate for persons aged 15 years and above,
             according to current weekly status (CWS), all India.</p>
          <span>{period_lfpr}</span>
        </section>
        <section class="metric">
          <strong>{wpr}%</strong>
          <h2>Worker Population Ratio (WPR)</h2>
          <p>Worker population ratio for persons aged 15 years and above,
             according to current weekly status (CWS), all India.</p>
          <span>{period_wpr}</span>
        </section>
        <section class="metric">
          <strong>{ur}%</strong>
          <h2>Unemployment Rate (UR)</h2>
          <p>Unemployment rate for persons aged 15 years and above,
             according to current weekly status (CWS), all India.</p>
          <span>{period_ur}</span>
        </section>
      </main>
      <footer>MoSPI Periodic Labour Force Survey. Published official statistical context.
      SHRAMIK must not treat this as vacancy demand or available workforce supply.</footer>
    </body></html>
    """


def hindi_fixture_page() -> str:
    return """
    <!doctype html><html><body>
      <main>
        <section class="metric">
          <strong>55.5%</strong>
          <h2>श्रम बल भागीदारी दर (एलएफपीआर)</h2>
          <p>15 वर्ष और उससे अधिक आयु वाले व्यक्ति (सीडब्ल्यूएस), देश में</p>
          <span>सितम्बर 2026</span>
        </section>
        <section class="metric">
          <strong>52.7%</strong>
          <h2>श्रमिक जनसंख्या अनुपात (डब्ल्यूपीआर)</h2>
          <p>15 वर्ष और उससे अधिक आयु के व्यक्ति (सीडब्ल्यूएस), देश में</p>
          <span>सितम्बर 2026</span>
        </section>
        <section class="metric">
          <strong>5.0%</strong>
          <h2>बेरोजगारी दर (यूआर)</h2>
          <p>15 वर्ष और उससे अधिक आयु वाले व्यक्ति (सीडब्ल्यूएस), देश में</p>
          <span>सितम्बर 2026</span>
        </section>
      </main>
    </body></html>
    """


def test_extracts_three_official_national_cws_rates_from_one_month() -> None:
    result = parse_monthly_cws(fixture_page())

    assert result["reference_period"] == "MONTHLY_2026-09"
    assert result["month_label"] == "September 2026"
    assert result["period_start"] == "2026-09-01"
    assert result["period_end"] == "2026-09-30"
    assert result["observation_grain"] == "NATIONAL"
    assert result["unit"] == "percent"
    assert result["survey_basis"] == "current_weekly_status"
    assert result["age_domain"] == "15_years_and_above"
    assert result["metrics"] == {
        "CWS_LFPR": 55.5,
        "CWS_WPR": 52.7,
        "CWS_UR": 5.0,
    }


def test_extracts_hindi_rendering_of_the_official_cards() -> None:
    result = parse_monthly_cws(hindi_fixture_page())
    assert result["reference_period"] == "MONTHLY_2026-09"
    assert result["month_label"] == "September 2026"
    assert result["metrics"] == {"CWS_LFPR": 55.5, "CWS_WPR": 52.7, "CWS_UR": 5.0}


def test_extracts_hindi_key_findings_acronyms_for_national_cws() -> None:
    page = """
    <!doctype html><html><body>
      <p>देश में 15 वर्ष और उससे अधिक आयु के व्यक्तियों के लिए सीडब्ल्यूएस में
      एलएफपीआर (%) सितंबर 2026 में 55.5% था।</p>
      <p>देश में 15 वर्ष और उससे अधिक आयु के व्यक्तियों के लिए सीडब्ल्यूएस में
      डब्ल्यूपीआर (%) सितंबर 2026 में 52.7% था।</p>
      <p>देश में 15 वर्ष और उससे अधिक आयु के व्यक्तियों के लिए सीडब्ल्यूएस में
      यूआर (%) सितंबर 2026 में 5.0% था।</p>
    </body></html>
    """
    result = parse_monthly_cws(page)
    assert result["reference_period"] == "MONTHLY_2026-09"
    assert result["metrics"] == {"CWS_LFPR": 55.5, "CWS_WPR": 52.7, "CWS_UR": 5.0}


def test_rejects_future_or_invalid_published_rates() -> None:
    with pytest.raises(ValueError, match="percentage value|outside"):
        parse_monthly_cws(fixture_page(lfpr="105.5"))


def test_rejects_mixed_periods_in_metric_cards() -> None:
    with pytest.raises(ValueError, match="different months"):
        parse_monthly_cws(fixture_page(period_ur="August 2026"))


def test_fails_closed_if_one_metric_card_is_missing() -> None:
    page = fixture_page().replace(
        "<h2>Worker Population Ratio (WPR)</h2>",
        "<h2>Worker Population Ratio</h2>",
    )
    with pytest.raises(ValueError, match="CWS_WPR"):
        parse_monthly_cws(page)


def test_ignores_script_values_not_presented_as_visible_page_content() -> None:
    page = fixture_page().replace(
        "<main>",
        "<script>999.9% Labour Force Participation Rate (LFPR) January 2099</script><main>",
    )
    result = parse_monthly_cws(page)
    assert result["reference_period"] == "MONTHLY_2026-09"
    assert result["metrics"]["CWS_LFPR"] == 55.5
