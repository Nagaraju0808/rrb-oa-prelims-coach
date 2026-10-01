// General Awareness guides. Only stable facts are included (verified Oct 2026 against PIB / RBI / official sources).
// Values that change often (policy rates, current office-holders) are deliberately left out — add them as current affairs.

export default {
  'banking-awareness': {
    concept: 'History, structure and functions of Indian banking — especially the RBI, Regional Rural Banks, NABARD and payment systems.',
    shortcuts: [
      ['RBI', 'Set up 1 April 1935 under the RBI Act, 1934; nationalised 1 January 1949; headquarters Mumbai. Banker to the government and to banks, issuer of currency, regulator of banks.'],
      ['Regional Rural Banks', 'Started 2 October 1975 (first: Prathama Bank, Moradabad); governed by the RRB Act, 1976. Ownership: Central Government 50%, sponsor bank 35%, State Government 15%.'],
      ['Development banks', 'NABARD — 12 July 1982, Mumbai (agriculture & rural credit, supervises RRBs and cooperatives). SIDBI — 2 April 1990, Lucknow (MSMEs). EXIM Bank — 1982, Mumbai.'],
      ['Nationalisation', '14 banks on 19 July 1969; 6 more in April 1980. SBI was formed on 1 July 1955 from the Imperial Bank of India.'],
      ['Payment systems', 'NPCI (2008) runs UPI (launched April 2016), IMPS (2010), RuPay. RBI runs NEFT (24×7 since 16 Dec 2019) and RTGS (minimum ₹2 lakh, 24×7 since 14 Dec 2020).'],
    ],
    formulas: ['IFSC = 11 characters (4-letter bank code + 0 + 6-character branch code).', 'MICR code = 9 digits (city–bank–branch).'],
    quick: ['Remember facts as “institution → year → HQ → role”.', 'Revise the RRB ownership split and the RBI/NABARD/SIDBI dates every week.'],
    traps: ['NEFT has no minimum amount; RTGS has a ₹2 lakh minimum.'],
  },
  'financial-awareness': {
    concept: 'Key banking and economic terms: monetary policy tools, reserve ratios, NPAs, inflation and markets.',
    shortcuts: [
      ['Policy rates', 'Repo rate: RBI lends to banks against securities. Reverse repo: RBI borrows from banks. Bank rate: long-term lending rate to banks without securities. MSF: emergency overnight borrowing by banks.'],
      ['Reserve ratios', 'CRR: share of deposits (NDTL) kept as cash with the RBI. SLR: share of deposits banks keep themselves in cash, gold or approved securities.'],
      ['Liquidity direction', 'Raising repo/CRR/SLR reduces money in the economy (fights inflation); cutting them adds liquidity.'],
      ['NPA', 'A loan becomes a non-performing asset when interest or principal is overdue for more than 90 days.'],
      ['Regulators', 'SEBI — securities market (1988; statutory 1992; Mumbai). IRDAI — insurance (1999; Hyderabad). PFRDA — pensions (2003).'],
    ],
    formulas: ['CASA = Current Account + Savings Account deposits.', 'Inflation indices: CPI (released by NSO, MoSPI) and WPI (Office of the Economic Adviser, DPIIT).'],
    quick: ['Sort each term into: rate, ratio, market, regulator or index.', 'Learn full forms of abbreviations together with their meaning.'],
    traps: ['Current values of repo/CRR/SLR change — check the latest RBI policy before the exam.'],
  },
  'government-schemes': {
    concept: 'Major central schemes on financial inclusion, insurance, pension, credit and agriculture.',
    shortcuts: [
      ['Jan Dhan (PMJDY)', 'Announced 15 Aug 2014, launched 28 Aug 2014 — zero-balance bank accounts for financial inclusion.'],
      ['Jan Suraksha trio (9 May 2015)', 'PMJJBY — life cover ₹2 lakh, ₹436/year, age 18–50. PMSBY — accident cover ₹2 lakh, ₹20/year, age 18–70. APY — pension ₹1,000–5,000/month, joining age 18–40.'],
      ['MUDRA (8 April 2015)', 'Collateral-free loans for micro-enterprises: Shishu up to ₹50,000; Kishore ₹50,000–5 lakh; Tarun ₹5–10 lakh; Tarun Plus ₹10–20 lakh (for repeat Tarun borrowers).'],
      ['Stand-Up India (5 April 2016)', 'Loans of ₹10 lakh–₹1 crore for greenfield enterprises by SC/ST and women entrepreneurs.'],
      ['Farm schemes', 'Kisan Credit Card — 1998 (NABARD model, R.V. Gupta Committee). PMFBY crop insurance — 2016. PM-KISAN — 24 Feb 2019, ₹6,000 a year in three ₹2,000 instalments.'],
    ],
    formulas: ['Memory hook: “J-S-M-S” = Jan Dhan 2014 → Suraksha 2015 → Mudra 2015 → Stand-Up 2016.'],
    quick: ['Make a table: scheme, year, beneficiary, benefit.', 'Revise amounts and age limits — they are the most asked details.'],
    traps: ['PMJJBY is life insurance; PMSBY is accident insurance — do not swap them.'],
  },
  'static-gk': {
    concept: 'Facts that do not change: international organisation headquarters, currencies, important days and Constitution basics.',
    shortcuts: [
      ['Geneva group', 'WTO, WHO, ILO and the Red Cross (ICRC) are headquartered in Geneva.'],
      ['Washington pair', 'IMF and World Bank — Washington, D.C. (both from the 1944 Bretton Woods conference).'],
      ['Asian banks', 'ADB — Manila; AIIB — Beijing; New Development Bank (BRICS) — Shanghai. BIS — Basel; UNESCO — Paris; UN — New York.'],
      ['Neighbour currencies', 'Bangladesh — Taka; Bhutan — Ngultrum; Nepal — Nepalese Rupee; Sri Lanka — Sri Lankan Rupee; Myanmar — Kyat; China — Renminbi (Yuan); Japan — Yen.'],
      ['Constitution articles', 'Art. 21 — life & personal liberty; Art. 32 — constitutional remedies; Art. 112 — Annual Financial Statement (Budget); Art. 148 — CAG; Art. 280 — Finance Commission.'],
    ],
    formulas: ['Important days: 8 March — International Women’s Day; 7 April — World Health Day; 5 June — World Environment Day; 26 November — Constitution Day; 23 December — National Farmers’ Day.'],
    quick: ['Group facts by city or theme instead of learning them one by one.'],
    traps: ['Many exams ask the city, not the country — learn both.'],
  },
  'agriculture-rural': {
    concept: 'Basics of Indian agriculture and rural credit that rural bank staff deal with every day.',
    shortcuts: [
      ['Crop seasons', 'Kharif — sown with the monsoon (June–July): rice, maize, cotton, soybean. Rabi — sown in winter (Oct–Nov): wheat, mustard, gram. Zaid — short summer season: watermelon, cucumber.'],
      ['Revolutions', 'Green — food grains (M.S. Swaminathan). White — milk (Operation Flood, Verghese Kurien). Blue — fisheries.'],
      ['Priority sector', 'RRBs must lend 75% of their advances to the priority sector (commercial banks: 40%).'],
      ['Rural credit institutions', 'NABARD refinances RRBs and cooperative banks; RRBs and cooperatives lend directly to farmers.'],
    ],
    formulas: ['KCC gives farmers revolving short-term credit for crops and allied activities.'],
    quick: ['Link each crop to its season by sowing month.'],
    traps: ['Season is decided by the SOWING time, not the harvest time.'],
  },
  'current-affairs': {
    concept: 'Banking, economic and national news from roughly the last six months before the exam.',
    shortcuts: [],
    formulas: ['Highest-yield areas: RBI policy decisions, banking appointments, new schemes, awards, summits, sports events, important reports and indices.'],
    quick: ['Read one monthly current-affairs capsule per month for the last 6 months.', 'Make one-line notes: event → who → where → when.', 'Add questions from your capsule in Admin → Questions (topic: Current Affairs) so they appear in your tests.', 'Revise notes every Sunday.'],
    traps: ['This app has no live news feed, so it cannot generate current-affairs questions on its own.'],
  },
}
