-- ============================================================
-- Seed data for Tours service
-- Guides:  marko=002, stefan=004, tijana=007, dragan=010
-- Tourists: ana=001, jovana=003, milica=005, nikola=006,
--           aleksandar=008, katarina=009
-- ============================================================

BEGIN;

-- ============================================================
-- Tours
-- ============================================================

INSERT INTO public."Tours" ("Id", "AuthorId", "Name", "Description", "Difficulty", "Tags", "Status", "Price", "CreatedAt", "PublishedAt", "ArchivedAt", "LengthInKm") VALUES

  -- Marko – Novi Sad city tours
  ('c1000000-0001-4000-8000-000000000001',
   'a1b2c3d4-0002-4000-8000-000000000002',
   'Novi Sad Old Town Walk',
   'A leisurely stroll through the historic core of Novi Sad — from the Dunavska street cafes to the iconic Name of Mary Church and the lively Zmaj Jovina boulevard.',
   'Easy', ARRAY['city','history','architecture','walking'], 'Published',
   12.00, '2024-03-01 09:00:00+00', '2024-03-05 10:00:00+00', NULL, 1.4),

  ('c1000000-0002-4000-8000-000000000002',
   'a1b2c3d4-0002-4000-8000-000000000002',
   'Petrovaradin Fortress Deep Dive',
   'Explore the underground tunnels, ramparts, and rich military history of the "Gibraltar on the Danube". Includes a visit to the clock tower and panoramic river views.',
   'Medium', ARRAY['fortress','history','danube','panorama'], 'Published',
   18.00, '2024-04-10 08:00:00+00', '2024-04-15 09:00:00+00', NULL, 0.7),

  ('c1000000-0003-4000-8000-000000000003',
   'a1b2c3d4-0002-4000-8000-000000000002',
   'Novi Sad Street Art Tour',
   'Discover the vibrant murals and urban art scene hidden in the courtyards and side streets of Novi Sad.',
   'Easy', ARRAY['art','street-art','culture','urban'], 'Draft',
   10.00, '2024-09-01 11:00:00+00', NULL, NULL, 0),

  -- Stefan – mountain / nature tours
  ('c1000000-0004-4000-8000-000000000004',
   'a1b2c3d4-0004-4000-8000-000000000004',
   'Tara Canyon Hike',
   'A full-day guided hike along the rim of the Tara River Canyon — one of the deepest gorges in Europe. Stunning viewpoints and old-growth forest throughout.',
   'Hard', ARRAY['hiking','nature','canyon','tara','adventure'], 'Published',
   35.00, '2024-02-20 07:00:00+00', '2024-02-28 08:00:00+00', NULL, 32.02),

  ('c1000000-0005-4000-8000-000000000005',
   'a1b2c3d4-0004-4000-8000-000000000004',
   'Kopaonik Summit Trail',
   'Reach the highest peak of Kopaonik National Park. The route passes through pine forests, alpine meadows, and ski resort infrastructure on the way to Pančićev vrh.',
   'Hard', ARRAY['hiking','mountain','kopaonik','nature'], 'Published',
   40.00, '2024-03-15 07:30:00+00', '2024-03-20 09:00:00+00', NULL, 24.03),

  ('c1000000-0006-4000-8000-000000000006',
   'a1b2c3d4-0004-4000-8000-000000000004',
   'Đavolja Varoš Mystery Tour',
   'Visit the eerie natural rock formations of Devil''s Town — over 200 stone figures carved by erosion, with legends of cursed wedding guests woven throughout.',
   'Medium', ARRAY['nature','geology','legend','sightseeing'], 'Published',
   22.00, '2024-05-01 08:00:00+00', '2024-05-07 09:00:00+00', NULL, 1.1),

  -- Tijana – food & wine tours
  ('c1000000-0007-4000-8000-000000000007',
   'a1b2c3d4-0007-4000-8000-000000000007',
   'Fruška Gora Wine & Monastery Trail',
   'Combine spirituality and gastronomy: visit two medieval monasteries on Fruška Gora then finish the day with a guided tasting at a family-owned winery.',
   'Hard', ARRAY['wine','food','monastery','fruska-gora','culture'], 'Published',
   45.00, '2024-01-15 10:00:00+00', '2024-01-20 10:00:00+00', NULL, 18.24),

  ('c1000000-0008-4000-8000-000000000008',
   'a1b2c3d4-0007-4000-8000-000000000007',
   'Belgrade Food Market Crawl',
   'From Zeleni Venac market to the Michelin-recommended kafanas of Skadarlija — taste traditional rakija, roštilj, and seasonal street food on this half-day culinary walk.',
   'Easy', ARRAY['food','belgrade','market','kafana','culture'], 'Published',
   20.00, '2024-06-01 09:00:00+00', '2024-06-05 10:00:00+00', NULL, 1.62),

  ('c1000000-0009-4000-8000-000000000009',
   'a1b2c3d4-0007-4000-8000-000000000007',
   'Šumadija Harvest Experience',
   'A seasonal tour through Šumadija vineyards during the October harvest. Guests participate in grape picking, learn about winemaking, and enjoy a farm-to-table lunch.',
   'Easy', ARRAY['wine','harvest','seasonal','sumadija','food'], 'Archived',
   55.00, '2023-09-01 08:00:00+00', '2023-09-10 09:00:00+00', '2023-11-01 00:00:00+00', 0),

  -- Dragan – river / Zemun tours
  ('c1000000-0010-4000-8000-000000000010',
   'a1b2c3d4-0010-4000-8000-000000000010',
   'Zemun Waterfront & Gardoš Tower',
   'Walk the cobblestone quay of Zemun, hear stories of its Austro-Hungarian past, and climb the Millennium Tower on Gardoš Hill for sweeping Danube views.',
   'Easy', ARRAY['zemun','danube','history','architecture','river'], 'Published',
   15.00, '2024-02-01 09:00:00+00', '2024-02-10 10:00:00+00', NULL, 0.4),

  ('c1000000-0011-4000-8000-000000000011',
   'a1b2c3d4-0010-4000-8000-000000000010',
   'Danube Sunset Cruise & Belgrade Panorama',
   'Board a traditional river boat at Zemun quay, cruise past Ada Ciganlija and the old Belgrade fortress, and watch the sun set over two rivers.',
   'Easy', ARRAY['cruise','danube','belgrade','sunset','river'], 'Published',
   30.00, '2024-04-01 14:00:00+00', '2024-04-05 15:00:00+00', NULL, 15.54),

  ('c1000000-0012-4000-8000-000000000012',
   'a1b2c3d4-0010-4000-8000-000000000010',
   'Great War Island Bird Watching',
   'A zodiac boat excursion to Veliko Ratno Ostrvo — a protected nature reserve at the confluence of the Sava and Danube — for bird watching and wetland ecology.',
   'Easy', ARRAY['nature','birdwatching','island','danube','ecology'], 'Published',
   28.00, '2024-05-15 07:00:00+00', '2024-05-20 08:00:00+00', NULL, 0.33);


-- ============================================================
-- KeyPoints
-- ============================================================

INSERT INTO public."KeyPoints" ("Id", "TourId", "Name", "Description", "Latitude", "Longitude", "ImageUrl", "Order") VALUES

  -- Tour 01 – Novi Sad Old Town Walk (3 points)
  ('d1000000-0001-4000-8000-000000000001', 'c1000000-0001-4000-8000-000000000001',
   'Trg Slobode (Freedom Square)', 'The central square of Novi Sad dominated by the neo-Gothic Name of Mary Church and the City Hall.', 45.2551, 19.8451, 'https://res.cloudinary.com/dd3x7sscj/image/upload/v1788106146/Y3m1zq6_fb42np.jpg', 1),
  ('d1000000-0002-4000-8000-000000000002', 'c1000000-0001-4000-8000-000000000001',
   'Zmaj Jovina Street', 'The main pedestrian boulevard lined with Baroque and Secession-era buildings, boutiques, and cafes.', 45.2555, 19.8428, 'https://res.cloudinary.com/dd3x7sscj/image/upload/v1788106146/t9YQ91y_gkkbjy.jpg', 2),
  ('d1000000-0003-4000-8000-000000000003', 'c1000000-0001-4000-8000-000000000001',
   'Dunavska Street & Danube Park', 'A peaceful riverside promenade with a historic park, the Bishop''s Palace, and views of Petrovaradin across the river.', 45.2589, 19.8458, 'https://res.cloudinary.com/dd3x7sscj/image/upload/v1788106148/89Ngzw1_svcfzk.jpg', 3),

  -- Tour 02 – Petrovaradin Fortress (4 points)
  ('d1000000-0004-4000-8000-000000000004', 'c1000000-0002-4000-8000-000000000002',
   'Upper Fortress Gate', 'The main entrance to the upper fortress, flanked by 18th-century ramparts built by Austrian engineers.', 45.2519, 19.8614, 'https://res.cloudinary.com/dd3x7sscj/image/upload/v1788106147/30FxZWc_orfuq6.jpg', 1),
  ('d1000000-0005-4000-8000-000000000005', 'c1000000-0002-4000-8000-000000000002',
   'Clock Tower', 'The iconic tower with famously reversed clock hands — the large hand shows hours, the small one minutes — so sailors on the Danube could read it easily.', 45.2512, 19.8626, 'https://res.cloudinary.com/dd3x7sscj/image/upload/v1788106148/X45E00s_ietfl8.jpg', 2),
  ('d1000000-0006-4000-8000-000000000006', 'c1000000-0002-4000-8000-000000000002',
   'Underground Tunnels Entrance', 'Sixteen kilometres of underground corridors used as barracks, storage, and escape routes. Temperature stays at 11 °C year-round.', 45.2515, 19.8620, 'https://res.cloudinary.com/dd3x7sscj/image/upload/v1788106146/XqUNpSk_h6ei0s.jpg', 3),
  ('d1000000-0007-4000-8000-000000000007', 'c1000000-0002-4000-8000-000000000002',
   'Danube Panorama Viewpoint', 'The highest rampart terrace offering a sweeping panorama of the Danube, Novi Sad skyline, and Fruška Gora hills beyond.', 45.2508, 19.8638, 'https://res.cloudinary.com/dd3x7sscj/image/upload/v1788106145/XIWNDIx_d2gqrq.jpg', 4),

  -- Tour 04 – Tara Canyon Hike (3 points)
  ('d1000000-0008-4000-8000-000000000008', 'c1000000-0004-4000-8000-000000000004',
   'Banjska Stena Viewpoint', 'A dramatic rock outcrop 1,100 m above sea level overlooking the deepest part of the Tara River Canyon.', 43.8521, 19.5123, 'https://res.cloudinary.com/dd3x7sscj/image/upload/v1788106146/R1hAkuU_u9muxv.jpg', 1),
  ('d1000000-0009-4000-8000-000000000009', 'c1000000-0004-4000-8000-000000000004',
   'Crno Jezero (Black Lake)', 'A glacial lake surrounded by black pine forest — the symbol of Tara National Park and a perfect rest stop.', 43.9012, 19.5847, 'https://res.cloudinary.com/dd3x7sscj/image/upload/v1788106145/zLyhAO6_kjgmk6.jpg', 2),
  ('d1000000-0010-4000-8000-000000000010', 'c1000000-0004-4000-8000-000000000004',
   'Zaovine Lake Overlook', 'An artificial reservoir with brilliant turquoise water cutting through the forested mountain ridges — best photographed from the ridge trail.', 43.8765, 19.4989, 'https://res.cloudinary.com/dd3x7sscj/image/upload/v1788106147/Htf2dQu_xsstj9.jpg', 3),

  -- Tour 05 – Kopaonik Summit Trail (3 points)
  ('d1000000-0011-4000-8000-000000000011', 'c1000000-0005-4000-8000-000000000005',
   'Gondola Top Station (Karaman Ridge)', 'The start of the alpine section at ~1,700 m. On clear days you can see as far as the Šar Mountains in North Macedonia.', 43.2891, 20.8102, 'https://res.cloudinary.com/dd3x7sscj/image/upload/v1788106145/ZJv6xAN_wl1zty.jpg', 1),
  ('d1000000-0012-4000-8000-000000000012', 'c1000000-0005-4000-8000-000000000005',
   'Pančićev Vrh Summit (2,017 m)', 'The highest peak of Kopaonik, marked by a monument to botanist Josif Pančić who described the Pančić spruce. 360-degree views.', 43.2654, 20.8012, 'https://res.cloudinary.com/dd3x7sscj/image/upload/v1788106145/tY6RukD_hkcszh.jpg', 2),
  ('d1000000-0013-4000-8000-000000000013', 'c1000000-0005-4000-8000-000000000005',
   'Samokovska Reka Spring', 'A crystal-clear mountain spring on the descent, surrounded by endemic Pančić spruce — the ideal lunch spot.', 43.2712, 20.8234, 'https://res.cloudinary.com/dd3x7sscj/image/upload/v1788106147/czaPcZZ_p0r7vq.jpg', 3),

  -- Tour 06 – Đavolja Varoš (2 points)
  ('d1000000-0014-4000-8000-000000000014', 'c1000000-0006-4000-8000-000000000006',
   'Lower Formation — "The Wedding"', 'The largest cluster of stone figures, locally said to be the petrified guests of a cursed wedding. Over 150 pillars up to 15 m tall.', 43.0298, 21.3741, 'https://res.cloudinary.com/dd3x7sscj/image/upload/v1788106146/sN9tz0R_shh1bg.jpg', 1),
  ('d1000000-0015-4000-8000-000000000015', 'c1000000-0006-4000-8000-000000000006',
   'Red & White Spring', 'Two natural springs whose highly acidic, mineral-rich waters are responsible for carving the stone figures over millennia.', 43.034, 21.362, 'https://res.cloudinary.com/dd3x7sscj/image/upload/v1788106148/OVohIId_pflczx.jpg', 2),

  -- Tour 07 – Fruška Gora Wine & Monastery (3 points)
  ('d1000000-0017-4000-8000-000000000017', 'c1000000-0007-4000-8000-000000000007',
   'Novo Hopovo Monastery', 'A peaceful hilltop monastery surrounded by fruit orchards, famous for its plum brandy and Morava-school fresco paintings.', 45.1421, 19.9965, 'https://res.cloudinary.com/dd3x7sscj/image/upload/v1788106145/zJAaLil_ttgc0g.jpg', 1),
  ('d1000000-0016-4000-8000-000000000016', 'c1000000-0007-4000-8000-000000000007',
   'Krušedol Monastery', 'A 16th-century Serbian Orthodox monastery, burial place of the Branković and Obrenović dynasties, with remarkable frescoes.', 45.1558, 19.9382, 'https://res.cloudinary.com/dd3x7sscj/image/upload/v1788106146/TdoxsEP_wdsrv6.jpg', 2),
  ('d1000000-0018-4000-8000-000000000018', 'c1000000-0007-4000-8000-000000000007',
   'Ivanović Family Winery', 'A boutique winery producing Neoplanta, Riesling, and Chardonnay. The tour ends with a cellar tasting of five wines paired with local cheese.', 45.1789, 19.9121, 'https://res.cloudinary.com/dd3x7sscj/image/upload/v1788106145/ZdxZjQR_mxgkll.jpg', 3),

  -- Tour 08 – Belgrade Food Market Crawl (3 points)
  ('d1000000-0019-4000-8000-000000000019', 'c1000000-0008-4000-8000-000000000008',
   'Zeleni Venac Market', 'Belgrade''s oldest covered market — a maze of stalls piled with seasonal vegetables, homemade jams, dried herbs, and mountain cheese.', 44.8168, 20.4545, 'https://res.cloudinary.com/dd3x7sscj/image/upload/v1788106146/T2QUDOP_pkq5vy.jpg', 1),
  ('d1000000-0020-4000-8000-000000000020', 'c1000000-0008-4000-8000-000000000008',
   'Skadarlija Cobblestone Quarter', 'The Bohemian quarter of Belgrade, lined with traditional kafanas serving cevapi, pljeskavica, and live Serbian folk music.', 44.8172, 20.4632, 'https://res.cloudinary.com/dd3x7sscj/image/upload/v1788106147/QlREYed_w0vnao.jpg', 2),
  ('d1000000-0021-4000-8000-000000000021', 'c1000000-0008-4000-8000-000000000008',
   'Rakija Bar Tasting Stop', 'A curated stop at a rakija specialist bar to sample 5 varieties — from quince to walnut — with snacks of ajvar and pogača bread.', 44.8165, 20.4608, 'https://res.cloudinary.com/dd3x7sscj/image/upload/v1788106148/29Skh3w_kpcbmx.jpg', 3),

  -- Tour 10 – Zemun Waterfront (3 points)
  ('d1000000-0022-4000-8000-000000000022', 'c1000000-0010-4000-8000-000000000010',
   'Zemun Quay (Kej)', 'The lively riverside promenade of Zemun, dotted with fish restaurants and floating cafes, with views across the Danube to New Belgrade.', 44.8449, 20.4098, 'https://res.cloudinary.com/dd3x7sscj/image/upload/v1788106146/RIsd6G2_enqbiq.jpg', 1),
  ('d1000000-0023-4000-8000-000000000023', 'c1000000-0010-4000-8000-000000000010',
   'Gardoš Hill Stairways', 'A steep climb through narrow lanes of old Zemun, past colourful houses dating back to the 18th-century Habsburg period.', 44.8461, 20.4132, 'https://res.cloudinary.com/dd3x7sscj/image/upload/v1788106147/CfTczEh_gtzcoc.jpg', 2),
  ('d1000000-0024-4000-8000-000000000024', 'c1000000-0010-4000-8000-000000000010',
   'Millennium Tower (Kula Sibinjanin Janka)', 'A neo-Romanesque tower built in 1896 to mark 1,000 years of Hungarian statehood. Offers the best panoramic views of the Danube confluence.', 44.8467, 20.4141, 'https://res.cloudinary.com/dd3x7sscj/image/upload/v1788106145/VOFcJBv_lfzp6u.jpg', 3),

  -- Tour 11 – Danube Sunset Cruise (3 points)
  ('d1000000-0025-4000-8000-000000000025', 'c1000000-0011-4000-8000-000000000011',
   'Zemun Boat Dock', 'Departure point on the Zemun quay. Traditional drveni čamac (wooden boat) or covered river vessel depending on season.', 44.8443, 20.4089, 'https://res.cloudinary.com/dd3x7sscj/image/upload/v1788106145/wgbUJd1_vn9ijj.jpg', 1),
  ('d1000000-0026-4000-8000-000000000026', 'c1000000-0011-4000-8000-000000000011',
   'Ada Ciganlija Pass', 'Cruise past the 4 km artificial river island — Belgrade''s beloved "Sea" — popular for swimming and sports in summer.', 44.7876, 20.4345, 'https://res.cloudinary.com/dd3x7sscj/image/upload/v1788106147/JtQzCVH_j6uivs.jpg', 2),
  ('d1000000-0027-4000-8000-000000000027', 'c1000000-0011-4000-8000-000000000011',
   'Kalemegdan Fortress from the Water', 'The most dramatic view of the Kalemegdan fortification walls rising above the Sava–Danube confluence, best seen at golden hour.', 44.8234, 20.4501, 'https://res.cloudinary.com/dd3x7sscj/image/upload/v1788106148/2OqHHr5_v2ymm3.jpg', 3),

  -- Tour 12 – Great War Island (2 points)
  ('d1000000-0028-4000-8000-000000000028', 'c1000000-0012-4000-8000-000000000012',
   'Zodiac Landing Beach', 'The only permitted landing spot on the protected island — a sandy shore surrounded by willow thickets.', 44.8578, 20.4234, 'https://res.cloudinary.com/dd3x7sscj/image/upload/v1788106145/TSpBXeX_rokybb.jpg', 1),
  ('d1000000-0029-4000-8000-000000000029', 'c1000000-0012-4000-8000-000000000012',
   'Heron & Cormorant Colony', 'A seasonal nesting area of grey herons and great cormorants visible from a safe observation distance at the island`s northern tip.', 44.8601, 20.4198, NULL, 2);


-- ============================================================
-- TourDurations
-- ============================================================

INSERT INTO public."TourDurations" ("Id", "TourId", "TransportType", "DurationInMinutes") VALUES
  -- Tour 01 Novi Sad Old Town Walk
  ('e1000000-0001-4000-8000-000000000001', 'c1000000-0001-4000-8000-000000000001', 'Walking',  90),
  ('e1000000-0002-4000-8000-000000000002', 'c1000000-0001-4000-8000-000000000001', 'Bicycle',  40),

  -- Tour 02 Petrovaradin Fortress
  ('e1000000-0003-4000-8000-000000000003', 'c1000000-0002-4000-8000-000000000002', 'Walking', 120),

  -- Tour 04 Tara Canyon Hike
  ('e1000000-0004-4000-8000-000000000004', 'c1000000-0004-4000-8000-000000000004', 'Walking', 360),

  -- Tour 05 Kopaonik Summit
  ('e1000000-0005-4000-8000-000000000005', 'c1000000-0005-4000-8000-000000000005', 'Walking', 300),

  -- Tour 06 Đavolja Varoš
  ('e1000000-0006-4000-8000-000000000006', 'c1000000-0006-4000-8000-000000000006', 'Walking',  90),
  ('e1000000-0007-4000-8000-000000000007', 'c1000000-0006-4000-8000-000000000006', 'Car',      15),

  -- Tour 07 Fruška Gora Wine
  ('e1000000-0008-4000-8000-000000000008', 'c1000000-0007-4000-8000-000000000007', 'Car',     150),
  ('e1000000-0009-4000-8000-000000000009', 'c1000000-0007-4000-8000-000000000007', 'Walking', 240),

  -- Tour 08 Belgrade Food Crawl
  ('e1000000-0010-4000-8000-000000000010', 'c1000000-0008-4000-8000-000000000008', 'Walking', 150),

  -- Tour 09 Šumadija Harvest (Archived)
  ('e1000000-0011-4000-8000-000000000011', 'c1000000-0009-4000-8000-000000000009', 'Car',     240),

  -- Tour 10 Zemun Waterfront
  ('e1000000-0012-4000-8000-000000000012', 'c1000000-0010-4000-8000-000000000010', 'Walking', 100),
  ('e1000000-0013-4000-8000-000000000013', 'c1000000-0010-4000-8000-000000000010', 'Bicycle',  45),

  -- Tour 11 Danube Sunset Cruise
  ('e1000000-0014-4000-8000-000000000014', 'c1000000-0011-4000-8000-000000000011', 'Walking',    120),

  -- Tour 12 Great War Island
  ('e1000000-0015-4000-8000-000000000015', 'c1000000-0012-4000-8000-000000000012', 'Walking',     90);


-- ============================================================
-- TourExecutions  (Status: 'active' | 'Completed' | 'Abandoned')
-- ============================================================

INSERT INTO public."TourExecutions" ("Id", "TourId", "TouristId", "Status", "StartedAt", "CompletedAt", "AbandonedAt", "LastActivity", "StartLatitude", "StartLongitude") VALUES

  -- Ana Completed Novi Sad Old Town Walk
  ('f1000000-0001-4000-8000-000000000001',
   'c1000000-0001-4000-8000-000000000001',
   'a1b2c3d4-0001-4000-8000-000000000001',
   'Completed',
   '2024-04-10 10:00:00+00', '2024-04-10 11:32:00+00', NULL, '2024-04-10 11:32:00+00',
   45.2551, 19.8451),

  -- Ana Completed Petrovaradin Fortress
  ('f1000000-0002-4000-8000-000000000002',
   'c1000000-0002-4000-8000-000000000002',
   'a1b2c3d4-0001-4000-8000-000000000001',
   'Completed',
   '2024-05-18 09:00:00+00', '2024-05-18 11:05:00+00', NULL, '2024-05-18 11:05:00+00',
   45.2519, 19.8614),

  -- Jovana Completed Tara Canyon Hike
  ('f1000000-0003-4000-8000-000000000003',
   'c1000000-0004-4000-8000-000000000004',
   'a1b2c3d4-0003-4000-8000-000000000003',
   'Completed',
   '2024-06-15 07:30:00+00', '2024-06-15 13:45:00+00', NULL, '2024-06-15 13:45:00+00',
   43.8521, 19.5123),

  -- Milica Completed Fruška Gora Wine Tour
  ('f1000000-0004-4000-8000-000000000004',
   'c1000000-0007-4000-8000-000000000007',
   'a1b2c3d4-0005-4000-8000-000000000005',
   'Completed',
   '2024-05-25 10:00:00+00', '2024-05-25 14:30:00+00', NULL, '2024-05-25 14:30:00+00',
   45.1558, 19.9382),

  -- Nikola Completed Belgrade Food Crawl
  ('f1000000-0005-4000-8000-000000000005',
   'c1000000-0008-4000-8000-000000000008',
   'a1b2c3d4-0006-4000-8000-000000000006',
   'Completed',
   '2024-07-04 11:00:00+00', '2024-07-04 13:45:00+00', NULL, '2024-07-04 13:45:00+00',
   44.8168, 20.4545),

  -- Aleksandar Completed Zemun Waterfront
  ('f1000000-0006-4000-8000-000000000006',
   'c1000000-0010-4000-8000-000000000010',
   'a1b2c3d4-0008-4000-8000-000000000008',
   'Completed',
   '2024-04-20 09:30:00+00', '2024-04-20 11:15:00+00', NULL, '2024-04-20 11:15:00+00',
   44.8449, 20.4098),

  -- Aleksandar Completed Danube Sunset Cruise
  ('f1000000-0007-4000-8000-000000000007',
   'c1000000-0011-4000-8000-000000000011',
   'a1b2c3d4-0008-4000-8000-000000000008',
   'Completed',
   '2024-05-10 17:30:00+00', '2024-05-10 19:35:00+00', NULL, '2024-05-10 19:35:00+00',
   44.8443, 20.4089),

  -- Katarina Abandoned Kopaonik Summit (turned back due to weather)
  ('f1000000-0008-4000-8000-000000000008',
   'c1000000-0005-4000-8000-000000000005',
   'a1b2c3d4-0009-4000-8000-000000000009',
   'Abandoned',
   '2024-07-20 08:00:00+00', NULL, '2024-07-20 10:30:00+00', '2024-07-20 10:30:00+00',
   43.2891, 20.8102),

  -- Nikola actively on Great War Island tour (live)
  ('f1000000-0009-4000-8000-000000000009',
   'c1000000-0012-4000-8000-000000000012',
   'a1b2c3d4-0006-4000-8000-000000000006',
   'Completed',
   '2024-08-01 07:15:00+00', NULL, NULL, '2024-08-01 07:58:00+00',
   44.8578, 20.4234),

  -- Jovana Completed Đavolja Varoš
  ('f1000000-0010-4000-8000-000000000010',
   'c1000000-0006-4000-8000-000000000006',
   'a1b2c3d4-0003-4000-8000-000000000003',
   'Completed',
   '2024-06-22 09:00:00+00', '2024-06-22 10:45:00+00', NULL, '2024-06-22 10:45:00+00',
   43.0298, 21.3721),

  -- Milica Completed Kopaonik Summit Trail
  ('f1000000-0011-4000-8000-000000000011',
   'c1000000-0005-4000-8000-000000000005',
   'a1b2c3d4-0005-4000-8000-000000000005',
   'Completed',
   '2024-07-28 07:30:00+00', '2024-07-28 12:50:00+00', NULL, '2024-07-28 12:50:00+00',
   43.2891, 20.8102);


-- ============================================================
-- CompletedKeyPoints
-- ============================================================

INSERT INTO public."CompletedKeyPoints" ("Id", "TourExecutionId", "KeyPointId", "CompletedAt") VALUES

  -- Ana – Novi Sad Old Town Walk (execution 0001) – all 3 KPs
  ('c4000000-0001-4000-8000-000000000001', 'f1000000-0001-4000-8000-000000000001', 'd1000000-0001-4000-8000-000000000001', '2024-04-10 10:20:00+00'),
  ('c4000000-0002-4000-8000-000000000002', 'f1000000-0001-4000-8000-000000000001', 'd1000000-0002-4000-8000-000000000002', '2024-04-10 10:55:00+00'),
  ('c4000000-0003-4000-8000-000000000003', 'f1000000-0001-4000-8000-000000000001', 'd1000000-0003-4000-8000-000000000003', '2024-04-10 11:32:00+00'),

  -- Ana – Petrovaradin Fortress (execution 0002) – all 4 KPs
  ('c4000000-0004-4000-8000-000000000004', 'f1000000-0002-4000-8000-000000000002', 'd1000000-0004-4000-8000-000000000004', '2024-05-18 09:25:00+00'),
  ('c4000000-0005-4000-8000-000000000005', 'f1000000-0002-4000-8000-000000000002', 'd1000000-0005-4000-8000-000000000005', '2024-05-18 09:55:00+00'),
  ('c4000000-0006-4000-8000-000000000006', 'f1000000-0002-4000-8000-000000000002', 'd1000000-0006-4000-8000-000000000006', '2024-05-18 10:30:00+00'),
  ('c4000000-0007-4000-8000-000000000007', 'f1000000-0002-4000-8000-000000000002', 'd1000000-0007-4000-8000-000000000007', '2024-05-18 11:05:00+00'),

  -- Jovana – Tara Canyon Hike (execution 0003) – all 3 KPs
  ('c4000000-0008-4000-8000-000000000008', 'f1000000-0003-4000-8000-000000000003', 'd1000000-0008-4000-8000-000000000008', '2024-06-15 09:10:00+00'),
  ('c4000000-0009-4000-8000-000000000009', 'f1000000-0003-4000-8000-000000000003', 'd1000000-0009-4000-8000-000000000009', '2024-06-15 11:20:00+00'),
  ('c4000000-0010-4000-8000-000000000010', 'f1000000-0003-4000-8000-000000000003', 'd1000000-0010-4000-8000-000000000010', '2024-06-15 13:45:00+00'),

  -- Milica – Fruška Gora Wine Tour (execution 0004) – all 3 KPs
  ('c4000000-0011-4000-8000-000000000011', 'f1000000-0004-4000-8000-000000000004', 'd1000000-0016-4000-8000-000000000016', '2024-05-25 10:50:00+00'),
  ('c4000000-0012-4000-8000-000000000012', 'f1000000-0004-4000-8000-000000000004', 'd1000000-0017-4000-8000-000000000017', '2024-05-25 12:10:00+00'),
  ('c4000000-0013-4000-8000-000000000013', 'f1000000-0004-4000-8000-000000000004', 'd1000000-0018-4000-8000-000000000018', '2024-05-25 14:30:00+00'),

  -- Nikola – Belgrade Food Crawl (execution 0005) – all 3 KPs
  ('c4000000-0014-4000-8000-000000000014', 'f1000000-0005-4000-8000-000000000005', 'd1000000-0019-4000-8000-000000000019', '2024-07-04 11:35:00+00'),
  ('c4000000-0015-4000-8000-000000000015', 'f1000000-0005-4000-8000-000000000005', 'd1000000-0020-4000-8000-000000000020', '2024-07-04 12:40:00+00'),
  ('c4000000-0016-4000-8000-000000000016', 'f1000000-0005-4000-8000-000000000005', 'd1000000-0021-4000-8000-000000000021', '2024-07-04 13:45:00+00'),

  -- Aleksandar – Zemun Waterfront (execution 0006) – all 3 KPs
  ('c4000000-0017-4000-8000-000000000017', 'f1000000-0006-4000-8000-000000000006', 'd1000000-0022-4000-8000-000000000022', '2024-04-20 09:55:00+00'),
  ('c4000000-0018-4000-8000-000000000018', 'f1000000-0006-4000-8000-000000000006', 'd1000000-0023-4000-8000-000000000023', '2024-04-20 10:30:00+00'),
  ('c4000000-0019-4000-8000-000000000019', 'f1000000-0006-4000-8000-000000000006', 'd1000000-0024-4000-8000-000000000024', '2024-04-20 11:15:00+00'),

  -- Aleksandar – Danube Sunset Cruise (execution 0007) – all 3 KPs
  ('c4000000-0020-4000-8000-000000000020', 'f1000000-0007-4000-8000-000000000007', 'd1000000-0025-4000-8000-000000000025', '2024-05-10 17:30:00+00'),
  ('c4000000-0021-4000-8000-000000000021', 'f1000000-0007-4000-8000-000000000007', 'd1000000-0026-4000-8000-000000000026', '2024-05-10 18:20:00+00'),
  ('c4000000-0022-4000-8000-000000000022', 'f1000000-0007-4000-8000-000000000007', 'd1000000-0027-4000-8000-000000000027', '2024-05-10 19:35:00+00'),

  -- Katarina – Kopaonik (execution 0008) – only 1st KP Completed before abandoning
  ('c4000000-0023-4000-8000-000000000023', 'f1000000-0008-4000-8000-000000000008', 'd1000000-0011-4000-8000-000000000011', '2024-07-20 08:50:00+00'),

  -- Nikola – Great War Island (execution 0009, active) – 1st KP only so far
  ('c4000000-0024-4000-8000-000000000024', 'f1000000-0009-4000-8000-000000000009', 'd1000000-0028-4000-8000-000000000028', '2024-08-01 07:40:00+00'),

  -- Jovana – Đavolja Varoš (execution 0010) – all 2 KPs
  ('c4000000-0025-4000-8000-000000000025', 'f1000000-0010-4000-8000-000000000010', 'd1000000-0014-4000-8000-000000000014', '2024-06-22 09:40:00+00'),
  ('c4000000-0026-4000-8000-000000000026', 'f1000000-0010-4000-8000-000000000010', 'd1000000-0015-4000-8000-000000000015', '2024-06-22 10:45:00+00'),

  -- Milica – Kopaonik Summit (execution 0011) – all 3 KPs
  ('c4000000-0027-4000-8000-000000000027', 'f1000000-0011-4000-8000-000000000011', 'd1000000-0011-4000-8000-000000000011', '2024-07-28 08:40:00+00'),
  ('c4000000-0028-4000-8000-000000000028', 'f1000000-0011-4000-8000-000000000011', 'd1000000-0012-4000-8000-000000000012', '2024-07-28 10:15:00+00'),
  ('c4000000-0029-4000-8000-000000000029', 'f1000000-0011-4000-8000-000000000011', 'd1000000-0013-4000-8000-000000000013', '2024-07-28 12:50:00+00');


-- ============================================================
-- Reviews  (only for Completed executions)
-- ============================================================

INSERT INTO public."Reviews" ("Id", "TourId", "TouristId", "TouristUsername", "TouristEmail", "Rating", "Comment", "VisitedAt", "CreatedAt", "ImageBase64s") VALUES

  -- Ana reviews Novi Sad Old Town Walk
  ('f4000000-0001-4000-8000-000000000001',
   'c1000000-0001-4000-8000-000000000001',
   'a1b2c3d4-0001-4000-8000-000000000001',
   'ana', 'ana@gmail.com',
   5,
   'Marko is a wonderful guide — so much knowledge packed into 90 minutes. The Dunavska Street section was my highlight. Highly recommend for first-time visitors to Novi Sad!',
   '2024-04-10 11:32:00+00', '2024-04-11 09:00:00+00', ARRAY[]::text[]),

  -- Ana reviews Petrovaradin Fortress
  ('f4000000-0002-4000-8000-000000000002',
   'c1000000-0002-4000-8000-000000000002',
   'a1b2c3d4-0001-4000-8000-000000000001',
   'ana', 'ana@gmail.com',
   5,
   'The underground tunnels were absolutely fascinating — I had no idea 16 km of corridors were hidden under the fortress. The clock tower story is a must-hear. Perfect tour.',
   '2024-05-18 11:05:00+00', '2024-05-19 10:00:00+00', ARRAY[]::text[]),

  -- Jovana reviews Tara Canyon Hike
  ('f4000000-0003-4000-8000-000000000003',
   'c1000000-0004-4000-8000-000000000004',
   'a1b2c3d4-0003-4000-8000-000000000003',
   'jovana', 'jovana@gmail.com',
   5,
   'Stefan knows every trail on Tara like the back of his hand. The Banjska Stena viewpoint literally took my breath away. Hard difficulty is accurate — bring good shoes and snacks!',
   '2024-06-15 13:45:00+00', '2024-06-16 08:30:00+00', ARRAY[]::text[]),

  -- Milica reviews Fruška Gora Wine Tour
  ('f4000000-0004-4000-8000-000000000004',
   'c1000000-0007-4000-8000-000000000007',
   'a1b2c3d4-0005-4000-8000-000000000005',
   'milica', 'milica@gmail.com',
   4,
   'Tijana clearly loves what she does. The monasteries were serene and beautiful, and the wine tasting at the end was the perfect reward. Gave 4 stars only because the car ride between stops was longer than expected.',
   '2024-05-25 14:30:00+00', '2024-05-26 11:00:00+00', ARRAY[]::text[]),

  -- Nikola reviews Belgrade Food Crawl
  ('f4000000-0005-4000-8000-000000000005',
   'c1000000-0008-4000-8000-000000000008',
   'a1b2c3d4-0006-4000-8000-000000000006',
   'nikola', 'nikola@gmail.com',
   5,
   'As a Belgrade local I thought I knew the food scene — Tijana showed me three spots I had never been to. The rakija tasting was the star of the show. Will do this again with friends.',
   '2024-07-04 13:45:00+00', '2024-07-05 10:15:00+00', ARRAY[]::text[]),

  -- Aleksandar reviews Zemun Waterfront
  ('f4000000-0006-4000-8000-000000000006',
   'c1000000-0010-4000-8000-000000000010',
   'a1b2c3d4-0008-4000-8000-000000000008',
   'aleksandar', 'alex@gmail.com',
   5,
   'Dragan was born and raised in Zemun and it shows — he knows every stone on Gardoš Hill. The view from the Millennium Tower is stunning. Perfect morning tour.',
   '2024-04-20 11:15:00+00', '2024-04-21 09:45:00+00', ARRAY[]::text[]),

  -- Aleksandar reviews Danube Sunset Cruise
  ('f4000000-0007-4000-8000-000000000007',
   'c1000000-0011-4000-8000-000000000011',
   'a1b2c3d4-0008-4000-8000-000000000008',
   'aleksandar', 'alex@gmail.com',
   5,
   'Two hours on the river at sunset — simply magical. The view of Kalemegdan from the water is something you cannot get any other way. Dragan''s storytelling about the Danube battles was captivating.',
   '2024-05-10 19:35:00+00', '2024-05-11 08:00:00+00', ARRAY[]::text[]),

  -- Jovana reviews Đavolja Varoš
  ('f4000000-0008-4000-8000-000000000008',
   'c1000000-0006-4000-8000-000000000006',
   'a1b2c3d4-0003-4000-8000-000000000003',
   'jovana', 'jovana@gmail.com',
   4,
   'The formations are genuinely eerie and unlike anything I have seen in Serbia. Stefan wove in the local legends really well. Docking one star because the site can get crowded with other groups mid-morning.',
   '2024-06-22 10:45:00+00', '2024-06-23 12:00:00+00', ARRAY[]::text[]),

  -- Milica reviews Kopaonik Summit Trail
  ('f4000000-0009-4000-8000-000000000009',
   'c1000000-0005-4000-8000-000000000005',
   'a1b2c3d4-0005-4000-8000-000000000005',
   'milica', 'milica@gmail.com',
   5,
   'Reaching the summit at 2,017 m was one of the best experiences of my life. Stefan set a great pace, explained the botany of the endemic spruce, and found us the most amazing lunch spot by the spring. 10/10.',
   '2024-07-28 12:50:00+00', '2024-07-29 09:30:00+00', ARRAY[]::text[]);

COMMIT;