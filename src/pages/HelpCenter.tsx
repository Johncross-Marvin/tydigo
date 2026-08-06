/**
 * Tydigo Help Center
 *
 * Searchable knowledge base with FAQ articles from the database.
 */

import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft, Search, BookOpen, Home, Truck, Award, Recycle,
  Shield, DollarSign, Building2, Package, ChevronRight, X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { supabase, isSupabaseAvailable } from "@/lib/supabase";
import { useAuth } from "@/components/auth-provider";

type HelpArticle = {
  id: string;
  title: string;
  slug: string;
  category: string;
  content: string;
  excerpt: string | null;
  icon: string | null;
  role: string | null;
};

const ICON_MAP: Record<string, typeof Home> = {
  Home, Truck, Award, Recycle, Shield, DollarSign, Building2, Package, BookOpen,
};

const CATEGORY_LABELS: Record<string, string> = {
  general: "General",
  household: "For Households",
  collector: "For Collectors",
  business: "For Businesses",
  recycler: "For Recyclers",
};

const HelpCenterPage = () => {
  const { user } = useAuth();
  const [articles, setArticles] = useState<HelpArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedArticle, setSelectedArticle] = useState<HelpArticle | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseAvailable() || !supabase) {
      setLoading(false);
      return;
    }

    supabase
      .from("help_articles")
      .select("*")
      .eq("is_published", true)
      .order("sort_order")
      .then(({ data }) => {
        setArticles((data as HelpArticle[]) || []);
        setLoading(false);
      });
  }, []);

  const filteredArticles = useMemo(() => {
    let filtered = articles;

    if (activeCategory) {
      filtered = filtered.filter((a) => a.category === activeCategory);
    }

    if (user?.role) {
      filtered = filtered.filter((a) => !a.role || a.role === user.role);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          (a.excerpt || "").toLowerCase().includes(q) ||
          a.content.toLowerCase().includes(q),
      );
    }

    return filtered;
  }, [articles, search, activeCategory, user]);

  const categories = useMemo(() => {
    const cats = new Set(articles.map((a) => a.category));
    return Array.from(cats);
  }, [articles]);

  if (selectedArticle) {
    const Icon = ICON_MAP[selectedArticle.icon || ""] || BookOpen;
    return (
      <div className="min-h-screen bg-neutral-50">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <button
            onClick={() => setSelectedArticle(null)}
            className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-[#145C25] mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Help Center
          </button>

          <Card className="border-0 shadow-brand-lg rounded-3xl">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center">
                  <Icon className="w-6 h-6 text-[#145C25]" />
                </div>
                <div>
                  <h1 className="text-xl font-extrabold text-neutral-900">{selectedArticle.title}</h1>
                  <p className="text-sm text-neutral-500">{CATEGORY_LABELS[selectedArticle.category] || selectedArticle.category}</p>
                </div>
              </div>
              <div className="prose prose-sm max-w-none text-neutral-700 leading-relaxed whitespace-pre-line">
                {selectedArticle.content}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link to="/household/dashboard" className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-[#145C25] mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-[#145C25]" />
          </div>
          <h1 className="text-2xl font-extrabold text-neutral-900 mb-2">Help Center</h1>
          <p className="text-neutral-500">Find answers to common questions about Tydigo.</p>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <div className="absolute left-4 top-1/2 -translate-y-1/2">
            <Search className="w-5 h-5 text-neutral-400" />
          </div>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search help articles..."
            className="pl-12 pr-12 h-14 rounded-2xl border-2 border-neutral-200 focus:border-[#145C25] text-base"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Categories */}
        {!search && (
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            <button
              onClick={() => setActiveCategory(null)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${
                !activeCategory ? "bg-[#145C25] text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${
                  activeCategory === cat ? "bg-[#145C25] text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                }`}
              >
                {CATEGORY_LABELS[cat] || cat}
              </button>
            ))}
          </div>
        )}

        {/* Articles */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-neutral-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
            <p className="text-neutral-500 font-medium">No articles found</p>
            <p className="text-sm text-neutral-400 mt-1">Try a different search term.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredArticles.map((article) => {
              const Icon = ICON_MAP[article.icon || ""] || BookOpen;
              return (
                <button
                  key={article.id}
                  onClick={() => setSelectedArticle(article)}
                  className="w-full flex items-center gap-4 p-4 bg-white rounded-2xl border border-neutral-100 hover:border-[#145C25] transition-colors text-left shadow-sm"
                >
                  <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-[#145C25]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-neutral-900 text-sm">{article.title}</p>
                    {article.excerpt && (
                      <p className="text-xs text-neutral-500 mt-0.5 line-clamp-1">{article.excerpt}</p>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-neutral-300 flex-shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default HelpCenterPage;
