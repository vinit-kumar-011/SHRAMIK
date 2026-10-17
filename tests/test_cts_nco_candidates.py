from scripts.build_cts_nco_candidates import make_candidates, normalize_title, score_titles


def test_nsqf_marker_is_normalized_but_occupation_words_remain():
    assert normalize_title("Electrician (NSQF)") == "electrician"
    assert normalize_title("Mechanic (Motor Vehicle) (NSQF)") == "mechanic motor vehicle"


def test_exact_title_ranks_first_and_is_never_auto_approved():
    nco = [
        {"nco_code": "7411.0100", "occupation_title": "Electrician, General", "occupation_family": "Building and Related Electricians"},
        {"nco_code": "7411.0200", "occupation_title": "Electrician (Mines)", "occupation_family": "Building and Related Electricians"},
    ]
    rows = make_candidates([{"trade_name_source": "Electrician, General", "occurrences": "12"}], nco)
    assert rows[0]["nco_code"] == "7411.0100"
    assert rows[0]["match_type"] == "EXACT_NORMALIZED"
    assert rows[0]["review_status"] == "PENDING_REVIEW"
    assert rows[0]["approved_mapping_method"] == ""


def test_title_scorer_is_bounded():
    assert score_titles("Electrician (NSQF)", "Electrician, General") > 0
    assert 0 <= score_titles("Unrelated role", "Accountant") <= 100
