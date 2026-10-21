# India state/UT boundary layer and attribution

## Competition-preview layer (not current official geometry)

The page can load a simplified state/UT GeoJSON from [GeoDataViewer's India boundary dataset](https://geodataviewer.com/datasets/boundaries/india-states-boundaries/), derived from the DataMeet India community boundary layer. The publisher lists **CC BY 2.5 India**, 36 administrative units, and a **2011 boundary vintage**. DataMeet itself documents known problems/older boundaries for some regions; therefore this is only a preview/competition prototype layer, not a claim of current authoritative boundaries.

Run `python assets/fetch_india_boundaries.py` on an internet-connected machine to vendor `assets/india-states.geojson` locally. The helper records source metadata and saves only after all 36 features map uniquely to the versioned SHRAMIK geography crosswalk. Keep the required attribution visible: **India state boundaries by the DataMeet India community; hosted by GeoDataViewer; CC BY 2.5 India**. See the [DataMeet source notes](https://projects.datameet.org/maps/states/).

## Official boundary option

The [National Water Data Portal / Survey of India State Boundary dataset](https://nwdp.nwic.gov.in/hi/dataset/state-boundary) lists a state/UT GeoJSON asset with a portal update timestamp of October 1, 2026. The public metadata reviewed for this package does not make redistribution terms clear. Do not vendor or redistribute it until the applicable terms have been confirmed. It is the preferred candidate for review before formal deployment, not included here.

## Data separation and validation

Boundary geometry and labour-demand metrics are separate data products. A recent boundary file does not make demand values live or source-backed. The browser requires exactly 36 features with 36 unique canonical geography IDs before rendering. Missing/suppressed metrics remain neutral grey, not zero. Use canonical `IN-*` IDs for new API payloads and treat legacy codes as aliases only.
