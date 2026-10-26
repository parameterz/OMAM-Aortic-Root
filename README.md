# OMAM Aortic Root Z-Scores

A single-page calculator for adult aortic root dimensions using the optimized multivariate allometric model (OMAM) equations and reference values from the CITED I study:

> Yao G, Hu X, Chen X, et al. Comparison of Body Surface Area and Optimized Multivariate Allometric Model Approaches in Correcting Echocardiographic Aortic Dimensions for Physiological Variances: An International and Multicenter Study (CITED I). *MedComm* 2026;7(6):e70788. [doi:10.1002/mco2.70788](https://doi.org/10.1002/mco2.70788)

The authors' own calculator returns only the predicted diameter (Yp) and the ratio measured/Yp. This page adds the context a practitioner needs to answer "is this normal?"

## What it reports

For the aortic annulus, sinuses of Valsalva and proximal ascending aorta:

- Expected diameter (Yp) for the patient's sex, age, height and weight
- Normal range in millimetres (Yp × published lower and upper limits)
- Percent predicted (Yc = measured / Yp)
- Z-score and percentile: z = (Yc − mean) / SD
- A flag against the published 95% reference limits
- The z-score under all three reference cohorts (Chinese, Italian, combined)

## Equations

Yp = a × b<sup>female</sup> × age<sup>x</sup> × height<sup>y</sup> × weight<sup>z</sup> (age in years, height in cm, weight in kg)

| Cohort | Site | a | b | x (age) | y (height) | z (weight) |
|---|---|---|---|---|---|---|
| Chinese | Ao-a | 9.593 | 0.943 | 0.054 | – | 0.142 |
| Chinese | Ao-s | 8.085 | 0.949 | 0.113 | – | 0.210 |
| Chinese | Ao-asc | 5.028 | 0.966 | 0.161 | – | 0.261 |
| Italian | Ao-a | 1.042 | 0.944 | 0.054 | 0.472 | 0.081 |
| Italian | Ao-s | 2.268 | 0.925 | 0.164 | 0.317 | 0.090 |
| Italian | Ao-asc | 6.385 | 0.956 | 0.204 | – | 0.175 |
| Combined | Ao-a | 2.948 | 0.928 | 0.060 | 0.338 | – |
| Combined | Ao-s | 2.689 | 0.950 | 0.137 | 0.210 | 0.198 |
| Combined | Ao-asc | 4.375 | 0.974 | 0.180 | – | 0.280 |

Coefficients match the paper and the authors' published calculator.

## Reference values

- **Chinese and Italian:** mean ± SD and 95% limits of Yc from Table 5 (n = 910 each). The normal/abnormal flag uses these limits, as the authors recommend.
- **Combined:** the paper publishes no reference values for this model. The page uses the sex-specific validation-group (group B) mean ± SD from Table 4, with limits at mean ± 1.96 SD. These are provisional.
- "High-normal" / "low-normal" (inside the limits but beyond the 95th / 5th percentile) is this page's addition, not the authors'.

## Limitations

- Derived in healthy, normotensive, non-obese (BMI < 30) adults aged 18–79; athletes and pregnant women excluded.
- Age is in every equation, so age-related dilation is treated as normal.
- All sites measured leading edge to leading edge at end-diastole in the parasternal long axis. This differs from the ASE convention for the annulus (inner edge, mid-systole).
- Only Han Chinese and Italian subjects were studied.

For research and education. It does not replace clinical judgement.

## Hosting

`index.html` is fully self-contained (Google Fonts is the only external request). Enable GitHub Pages on the `main` branch, root folder, to serve it.
