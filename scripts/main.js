// scripts/main.js
// California Agro Pro++ Showcase (paste into GEE Code Editor if needed)

// California ROI
var california = ee.FeatureCollection("TIGER/2018/States")
  .filter(ee.Filter.eq('NAME', 'California'));
Map.centerObject(california, 6);

// DEM Hillshade
var dem = ee.Image("USGS/SRTMGL1_003").clip(california);
var hill = ee.Terrain.hillshade(dem);
Map.addLayer(hill, {min:150, max:255}, "DEM Hillshade", true);

// Sentinel-2 composite & indices (scaled)
var s2 = ee.ImageCollection("COPERNICUS/S2_SR")
  .filterDate('2023-04-01','2023-10-31')
  .filterBounds(california)
  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE',20))
  .map(function(img){ return img.divide(10000); })
  .median()
  .clip(california);

// Indices
var ndvi = s2.normalizedDifference(['B8','B4']).rename('NDVI');
var evi = s2.expression(
  '2.5 * ((NIR - RED) / (NIR + 6 * RED - 7.5 * BLUE + 1))', {
    'NIR': s2.select('B8'), 'RED': s2.select('B4'), 'BLUE': s2.select('B2')
  }).rename('EVI');
var ndwi = s2.normalizedDifference(['B3','B8']).rename('NDWI');

// Soil (GLDAS) and Groundwater (GRACE) — reproject for visible overlay
var soil = ee.ImageCollection("NASA/GLDAS/V021/NOAH/G025/T3H")
  .filterDate('2023-04-01','2023-10-31')
  .select('SoilMoi0_10cm_inst')
  .mean()
  .clip(california)
  .resample('bilinear').reproject('EPSG:4326', null, 25000);

var grace = ee.ImageCollection("NASA/GRACE/MASS_GRIDS/LAND")
  .select('lwe_thickness')
  .filterDate('2023-04-01','2023-10-31')
  .mean()
  .clip(california)
  .resample('bilinear').reproject('EPSG:4326', null, 100000);

// Visualization palettes
var ndviVis = {min:0, max:1, palette:['#d73027','#fc8d59','#fee090','#e0f3f8','#91bfdb','#4575b4']};
var eviVis  = {min:0, max:1, palette:['#ffffcc','#a1dab4','#41b6c4','#2c7fb8','#253494']};
var ndwiVis = {min:-0.5, max:0.5, palette:['#d7191c','#fdae61','#ffffbf','#abd9e9','#2c7bb6']};
var soilVis = {min:0, max:0.5, palette:['#fff7ec','#fdbb84','#e34a33']};
var graceVis= {min:-30, max:30, palette:['#67001f','#f4a582','#f7f7f7','#92c5de','#053061']};

// Add color layers (toggleable in map layers)
Map.addLayer(ndvi, ndviVis, "🌿 NDVI (Crop Health)", true);
Map.addLayer(evi, eviVis, "🌱 EVI (Vegetation)", false);
Map.addLayer(ndwi, ndwiVis, "💧 NDWI (Water Index)", false);
Map.addLayer(soil, soilVis, "🌾 Soil Moisture (GLDAS)", false);
Map.addLayer(grace, graceVis, "🌍 Groundwater (GRACE)", false);
