'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { 
  Bot, 
  Zap, 
  Target, 
  BarChart3, 
  Shield, 
  Clock, 
  ArrowRight, 
  Check, 
  Star,
  Sparkles,
  TrendingUp,
  MessageSquare,
  Users,
  Globe,
  Rocket,
  ChevronDown,
  Play
} from 'lucide-react'
import Link from 'next/link'

export default function LandingPage() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [activeFeature, setActiveFeature] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % 3)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  const features = [
    {
      icon: Bot,
      title: "AI-Powered Engagement",
      description: "Generate viral, contextual replies using advanced AI that understands sentiment and tone",
      gradient: "from-blue-500 to-cyan-500"
    },
    {
      icon: Target,
      title: "Smart Target Monitoring",
      description: "Track your target users and never miss an engagement opportunity with real-time monitoring",
      gradient: "from-purple-500 to-pink-500"
    },
    {
      icon: BarChart3,
      title: "Advanced Analytics",
      description: "Get detailed insights on your engagement performance with comprehensive analytics dashboard",
      gradient: "from-emerald-500 to-teal-500"
    }
  ]

  const stats = [
    { label: "Users Worldwide", value: "10K+", icon: Users },
    { label: "Tweets Generated", value: "1M+", icon: MessageSquare },
    { label: "Engagement Rate", value: "85%", icon: TrendingUp },
    { label: "Countries", value: "50+", icon: Globe }
  ]

  const pricingTiers = [
    {
      name: "Starter",
      price: "$9",
      description: "Perfect for individuals getting started",
      features: [
        "5 Target users",
        "100 AI replies/month",
        "Basic analytics",
        "Email support"
      ],
      popular: false
    },
    {
      name: "Pro",
      price: "$29",
      description: "Best for growing creators and businesses",
      features: [
        "25 Target users",
        "1,000 AI replies/month",
        "Advanced analytics",
        "Priority support",
        "Custom templates",
        "Scheduling"
      ],
      popular: true
    },
    {
      name: "Enterprise",
      price: "$99",
      description: "For large teams and agencies",
      features: [
        "Unlimited targets",
        "Unlimited AI replies",
        "Team collaboration",
        "White-label solution",
        "API access",
        "Dedicated support"
      ],
      popular: false
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'glass border-b border-white/20 backdrop-blur-xl' : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                AutoYapp Pro
              </span>
            </div>
            
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-600 hover:text-gray-900 transition-colors">Features</a>
              <a href="#pricing" className="text-gray-600 hover:text-gray-900 transition-colors">Pricing</a>
              <a href="#about" className="text-gray-600 hover:text-gray-900 transition-colors">About</a>
            </div>

            <div className="flex items-center space-x-4">
              <Link href="/sign-in">
                <Button variant="ghost" className="text-gray-600 hover:text-gray-900">
                  Sign In
                </Button>
              </Link>
              <Link href="/sign-up">
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <Badge className="mb-6 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 border-blue-200 hover:scale-105 transition-transform">
            <Rocket className="h-3 w-3 mr-1" />
            AI-Powered Social Media Automation
          </Badge>
          
          <h1 className="text-6xl md:text-7xl font-bold mb-8 leading-tight">
            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
              Automate Your
            </span>
            <br />
            <span className="text-gray-900">
              X Engagement
            </span>
          </h1>
          
          <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed">
            Transform your X (Twitter) presence with AI-powered replies, smart target monitoring, 
            and viral content generation. Boost engagement while you sleep.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6 mb-16">
            <Link href="/register">
              <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-xl px-8 py-4 text-lg rounded-2xl hover:scale-105 transition-all duration-200">
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="glass border-white/20 hover:bg-white/50 px-8 py-4 text-lg rounded-2xl hover:scale-105 transition-all duration-200">
              <Play className="mr-2 h-5 w-5" />
              Watch Demo
            </Button>
          </div>

          {/* Hero Animation */}
          <div className="relative max-w-4xl mx-auto">
            <div className="glass rounded-3xl p-8 border border-white/20 shadow-2xl">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {features.map((feature, index) => (
                  <Card 
                    key={index} 
                    className={`border-0 transition-all duration-500 hover:scale-105 ${
                      activeFeature === index 
                        ? 'glass shadow-xl scale-105' 
                        : 'bg-white/30 hover:bg-white/50'
                    }`}
                  >
                    <CardContent className="p-6 text-center">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${feature.gradient} flex items-center justify-center mx-auto mb-4`}>
                        <feature.icon className="h-6 w-6 text-white" />
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
                      <p className="text-sm text-gray-600">{feature.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center text-white">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <stat.icon className="h-6 w-6" />
                </div>
                <div className="text-3xl font-bold mb-2">{stat.value}</div>
                <div className="text-blue-100">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-700 border-emerald-200">
              <Zap className="h-3 w-3 mr-1" />
              Powerful Features
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Everything you need to
              <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent"> dominate X</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our comprehensive suite of AI-powered tools helps you build meaningful connections and grow your audience organically.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Bot,
                title: "AI Reply Generation",
                description: "Generate contextual, viral replies that match your voice and increase engagement rates by 300%",
                color: "blue"
              },
              {
                icon: Target,
                title: "Smart Targeting",
                description: "Monitor influencers and thought leaders in your niche to never miss engagement opportunities",
                color: "purple"
              },
              {
                icon: Clock,
                title: "Auto Scheduling",
                description: "Schedule replies and tweets for optimal engagement times across different time zones",
                color: "emerald"
              },
              {
                icon: BarChart3,
                title: "Performance Analytics",
                description: "Track engagement rates, follower growth, and ROI with detailed analytics and reporting",
                color: "orange"
              },
              {
                icon: Shield,
                title: "Compliance Safe",
                description: "Built-in rate limiting and compliance monitoring to keep your account safe and healthy",
                color: "red"
              },
              {
                icon: Sparkles,
                title: "Viral Content Engine",
                description: "AI analyzes trending content patterns to help you create posts that go viral",
                color: "pink"
              }
            ].map((feature, index) => (
              <Card key={index} className="group glass border-white/20 hover:shadow-xl transition-all duration-300 hover:scale-105">
                <CardContent className="p-8">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-r from-${feature.color}-500 to-${feature.color}-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-6 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 border-blue-200">
              <Star className="h-3 w-3 mr-1" />
              Simple Pricing
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Choose your
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> growth plan</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Start free and scale as you grow. All plans include our core AI features with different usage limits.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {pricingTiers.map((tier, index) => (
              <Card 
                key={index} 
                className={`relative overflow-hidden transition-all duration-300 hover:scale-105 ${
                  tier.popular 
                    ? 'ring-2 ring-blue-500 glass shadow-2xl' 
                    : 'glass border-white/20 hover:shadow-xl'
                }`}
              >
                {tier.popular && (
                  <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-center py-2 text-sm font-medium">
                    Most Popular
                  </div>
                )}
                <CardContent className={`p-8 ${tier.popular ? 'pt-12' : ''}`}>
                  <div className="text-center mb-8">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{tier.name}</h3>
                    <div className="mb-4">
                      <span className="text-4xl font-bold text-gray-900">{tier.price}</span>
                      <span className="text-gray-600">/month</span>
                    </div>
                    <p className="text-gray-600">{tier.description}</p>
                  </div>
                  
                  <ul className="space-y-4 mb-8">
                    {tier.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center">
                        <Check className="h-5 w-5 text-emerald-500 mr-3 flex-shrink-0" />
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Button 
                    className={`w-full py-3 rounded-xl font-medium transition-all duration-200 ${
                      tier.popular
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg'
                        : 'bg-gray-900 hover:bg-gray-800 text-white'
                    }`}
                  >
                    Get Started
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to 10x your X engagement?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join thousands of creators and businesses who are already using AutoYapp Pro to grow their audience and increase engagement.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
            <Link href="/register">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 shadow-xl px-8 py-4 text-lg rounded-2xl hover:scale-105 transition-all duration-200">
                Start Your Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10 px-8 py-4 text-lg rounded-2xl hover:scale-105 transition-all duration-200">
              Contact Sales
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-gray-900 text-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold">AutoYapp Pro</span>
              </div>
              <p className="text-gray-400">
                AI-powered social media automation for the next generation of creators.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Integrations</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Status</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 AutoYapp Pro. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Scroll to top button */}
      {isScrolled && (
        <Button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 w-12 h-12 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:scale-110 transition-all duration-200 z-50"
        >
          <ChevronDown className="h-5 w-5 rotate-180" />
        </Button>
      )}
    </div>
  )
}