/**
 * PostGIS feature - Geographic and spatial data support
 * Provides spatial types, functions, and indexes
 */

import type { Feature } from "../types.ts";

export const postgisFeature: Feature = {
  name: "postgis",
  description: "Geographic and spatial data support for PostgreSQL",
  
  extensions: ["postgis", "postgis_topology"],
  
  types: {
    geometry: {
      sql: "geometry",
      typescript: { type: "Geometry", import: "@types/geojson" },
      python: { type: "BaseGeometry", import: "shapely.geometry" },
      go: { type: "orb.Geometry", import: "github.com/paulmach/orb" },
      rust: { type: "geo_types::Geometry<f64>", import: "geo-types" }
    },
    geography: {
      sql: "geography",
      typescript: { type: "Geometry", import: "@types/geojson" },
      python: { type: "BaseGeometry", import: "shapely.geometry" },
      go: { type: "orb.Geometry", import: "github.com/paulmach/orb" },
      rust: { type: "geo_types::Geometry<f64>", import: "geo-types" }
    },
    "geometry(Point)": {
      sql: "geometry(Point)",
      typescript: { type: "Point", import: "@types/geojson" },
      python: { type: "Point", import: "shapely.geometry" },
      go: { type: "orb.Point", import: "github.com/paulmach/orb" },
      rust: { type: "geo_types::Point<f64>", import: "geo-types" }
    },
    "geometry(LineString)": {
      sql: "geometry(LineString)",
      typescript: { type: "LineString", import: "@types/geojson" },
      python: { type: "LineString", import: "shapely.geometry" },
      go: { type: "orb.LineString", import: "github.com/paulmach/orb" },
      rust: { type: "geo_types::LineString<f64>", import: "geo-types" }
    },
    "geometry(Polygon)": {
      sql: "geometry(Polygon)",
      typescript: { type: "Polygon", import: "@types/geojson" },
      python: { type: "Polygon", import: "shapely.geometry" },
      go: { type: "orb.Polygon", import: "github.com/paulmach/orb" },
      rust: { type: "geo_types::Polygon<f64>", import: "geo-types" }
    },
    "geometry(MultiPoint)": {
      sql: "geometry(MultiPoint)",
      typescript: { type: "MultiPoint", import: "@types/geojson" },
      python: { type: "MultiPoint", import: "shapely.geometry" },
      go: { type: "orb.MultiPoint", import: "github.com/paulmach/orb" },
      rust: { type: "geo_types::MultiPoint<f64>", import: "geo-types" }
    },
    "geometry(MultiLineString)": {
      sql: "geometry(MultiLineString)",
      typescript: { type: "MultiLineString", import: "@types/geojson" },
      python: { type: "MultiLineString", import: "shapely.geometry" },
      go: { type: "orb.MultiLineString", import: "github.com/paulmach/orb" },
      rust: { type: "geo_types::MultiLineString<f64>", import: "geo-types" }
    },
    "geometry(MultiPolygon)": {
      sql: "geometry(MultiPolygon)",
      typescript: { type: "MultiPolygon", import: "@types/geojson" },
      python: { type: "MultiPolygon", import: "shapely.geometry" },
      go: { type: "orb.MultiPolygon", import: "github.com/paulmach/orb" },
      rust: { type: "geo_types::MultiPolygon<f64>", import: "geo-types" }
    }
  },

  functions: {
    ST_MakePoint: {
      returns: "geometry(Point)",
      sql: "ST_MakePoint(x, y)",
      args: { x: "float8", y: "float8" }
    },
    ST_GeomFromText: {
      returns: "geometry",
      sql: "ST_GeomFromText(text, srid)",
      args: { text: "text", srid: "integer" }
    },
    ST_Distance: {
      returns: "float8",
      sql: "ST_Distance(geom1, geom2)",
      args: { geom1: "geometry", geom2: "geometry" }
    },
    ST_Within: {
      returns: "boolean",
      sql: "ST_Within(geom1, geom2)",
      args: { geom1: "geometry", geom2: "geometry" }
    },
    ST_Contains: {
      returns: "boolean",
      sql: "ST_Contains(geom1, geom2)",
      args: { geom1: "geometry", geom2: "geometry" }
    },
    ST_Intersects: {
      returns: "boolean",
      sql: "ST_Intersects(geom1, geom2)",
      args: { geom1: "geometry", geom2: "geometry" }
    }
  },

  operators: {
    "&&": {
      left: "geometry",
      right: "geometry",
      returns: "boolean",
      description: "Bounding box overlaps"
    },
    "~": {
      left: "geometry",
      right: "geometry",
      returns: "boolean",
      description: "Contains"
    },
    "@": {
      left: "geometry",
      right: "geometry",
      returns: "boolean",
      description: "Within"
    }
  },

  indexes: {
    spatial: {
      type: "GIST",
      applicable: ["geometry", "geography"],
      sql: "CREATE INDEX {name} ON {table} USING GIST ({column})"
    },
    spatial_nd: {
      type: "GIST",
      applicable: ["geometry"],
      sql: "CREATE INDEX {name} ON {table} USING GIST ({column} gist_geometry_ops_nd)"
    }
  }
};