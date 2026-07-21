import * as React from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function DesignSystemShowcase() {
  return (
    <div className="container mx-auto py-10 space-y-12">
      <div className="space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">TallyMe Design System</h1>
        <p className="text-lg text-muted-foreground">
          Enterprise UI primitives and foundational components.
        </p>
      </div>

      <section className="space-y-6">
        <h2 className="text-2xl font-semibold border-b pb-2">Buttons</h2>
        <div className="flex flex-wrap gap-4 items-center">
          <Button variant="default">Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
          <Button isLoading>Loading</Button>
          <Button disabled>Disabled</Button>
        </div>
        <div className="flex flex-wrap gap-4 items-center">
          <Button size="sm">Small</Button>
          <Button size="default">Default</Button>
          <Button size="lg">Large</Button>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-semibold border-b pb-2">Badges</h2>
        <div className="flex flex-wrap gap-4">
          <Badge variant="default">Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="destructive">Destructive</Badge>
          <Badge variant="outline">Outline</Badge>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-semibold border-b pb-2">Cards</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Example Card</CardTitle>
              <CardDescription>This is a standard card component.</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Card content goes here. It provides a standard container with correct padding and background.</p>
            </CardContent>
            <CardFooter>
              <Button className="w-full">Action</Button>
            </CardFooter>
          </Card>
        </div>
      </section>
    </div>
  )
}
